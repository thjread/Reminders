use actix::prelude::*;
use tokio::prelude::future::*;
use std::time::Duration;
use web_push::*;
use failure::Error;
use chrono::prelude::*;
use futures::future::Either;
use uuid::Uuid;
use serde_derive::{Serialize};

use crate::database::{DbExecutor, GetNotifications, Unsubscribe};
use crate::models::Todo;

const PUSH_FREQUENCY: u64 = 1;
const PUSH_TTL: u32 = 600;
const PRIVATE_KEY: &'static str = include_str!("../secrets/private_key.pem");

pub struct Push {
    pub db: Addr<DbExecutor>,
    pub last_notify: NaiveDateTime,
}

impl Actor for Push {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {

        ctx.run_interval(Duration::from_secs(PUSH_FREQUENCY), |a, ctx| {
            push(a, ctx)
        });
    }
}

#[derive(Serialize)]
struct PushPayload {
    id: Uuid,
    userid: Uuid,
    title: String,
    deadline: Option<NaiveDateTime>,
}

fn notify(todo: Todo, info: SubscriptionInfo, userid: Uuid, db: Addr<DbExecutor>) -> impl Future<Item = (), Error = Error> {
    println!("Sending push notification to user {}", userid);
    fn notify_result(todo: Todo, info: &SubscriptionInfo) -> Result<Box<Future<Item=(), Error=WebPushError>>, Error> {
        let payload = PushPayload {
            id: todo.id,
            userid: todo.userid,
            title: todo.title,
            deadline: todo.deadline,
        };
        let payload_json = serde_json::to_string(&payload)?;

        let mut builder = WebPushMessageBuilder::new(&info)?;
        builder.set_payload(ContentEncoding::AesGcm, payload_json.as_bytes());
        builder.set_ttl(PUSH_TTL);

        let sig_builder = VapidSignatureBuilder::from_pem(PRIVATE_KEY.as_bytes(), &info)?;
        let signature = sig_builder.build()?;
        builder.set_vapid_signature(signature);

        let message = builder.build()?;
        let client = WebPushClient::new()?;

        Ok(Box::new(client.send_with_timeout(message, Duration::from_secs(4)).from_err()))
    }

    match notify_result(todo, &info) {
        Ok(fut) => Either::A(fut.or_else(move |e: WebPushError| match e {
            WebPushError::Unauthorized | WebPushError::InvalidUri | WebPushError::EndpointNotValid | WebPushError::EndpointNotFound => {
                println!("Sending notification failed with error {:?}, unsubscribing endpoint {:?}", e, info);
                Either::A(db.send(Unsubscribe{userid: userid, endpoint: info.endpoint})
                          .from_err()
                          .and_then(|res| {
                              match res {
                                  Ok(_) => (),
                                  Err(e) => {
                                      println!("Error {:?} while unsubscribing invalid subscription", e);
                                  }
                              }
                              futures::future::err(e.into())
                          }))
            },
            _ => Either::B(futures::future::err(e.into()))
        })),
        Err(e) => Either::B(futures::future::err(e.into()))
    }
}

fn push(a: &mut Push, ctx: &mut Context<Push>) {
    let since = a.last_notify;
    let now = Utc::now().naive_utc();
    a.last_notify = now;

    let db = a.db.clone();
    let fut = db.send(GetNotifications {
        since: since,
        until: now,
    }).and_then(move |res| match res {
        Err(e) => {
            Either::A(futures::future::ok(println!("Error {:?} retrieving todos and subscriptions to notify", e)))
        }
        Ok(ts) => {
            Either::B(futures::future::join_all(ts.into_iter().map(move |(todo, subscription)| {
                let info = SubscriptionInfo {
                    endpoint: subscription.endpoint,
                    keys: SubscriptionKeys {
                        auth: subscription.auth,
                        p256dh: subscription.p256dh,
                    }
                };
                notify(todo, info, subscription.userid, db.clone()).or_else(|e| {
                    // must return ok or join_all will cancel other futures
                    println!("Error {:?} on notification", e);
                    futures::future::ok(())
                })
            })).map(|_| ()))
        }
    });
    ctx.spawn(fut.map_err(|_| ()).into_actor(a));
}
