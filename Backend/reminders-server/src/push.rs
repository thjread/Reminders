use actix::prelude::*;
use chrono::prelude::*;
use failure::Error;
use futures::future::Either;
use serde_derive::Serialize;
use std::time::Duration;
use tokio::prelude::future::*;
use uuid::Uuid;
use web_push::*;

use crate::database::{DbExecutor, GetNotifications, Unsubscribe};
use crate::models::Todo;
const PRIVATE_KEY: &'static str = include_str!("../secrets/private_key.pem");

pub struct Push {
    pub db: Addr<DbExecutor>,
    pub last_notify: NaiveDateTime,
    pub frequency: u64,
    pub ttl: u32,
}

impl Actor for Push {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        ctx.run_interval(Duration::from_secs(self.frequency), |a, ctx| push(a, ctx));
    }
}

#[derive(Serialize)]
struct PushPayload {
    id: Uuid,
    userid: Uuid,
    title: String,
    deadline: Option<NaiveDateTime>,
}

fn notify(
    todo: Todo,
    info: SubscriptionInfo,
    userid: Uuid,
    db: Addr<DbExecutor>,
    ttl: u32,
) -> impl Future<Item = (), Error = Error> {
    println!("Sending push notification to user {}", userid);
    fn notify_result(
        todo: Todo,
        info: &SubscriptionInfo,
        ttl: u32,
    ) -> Result<Box<Future<Item = (), Error = WebPushError>>, Error> {
        let payload = PushPayload {
            id: todo.id,
            userid: todo.userid,
            title: todo.title,
            deadline: todo.deadline,
        };
        let payload_json = serde_json::to_string(&payload)?;

        let mut builder = WebPushMessageBuilder::new(&info)?;
        builder.set_payload(ContentEncoding::AesGcm, payload_json.as_bytes());
        builder.set_ttl(ttl);

        let sig_builder = VapidSignatureBuilder::from_pem(PRIVATE_KEY.as_bytes(), &info)?;
        let signature = sig_builder.build()?;
        builder.set_vapid_signature(signature);

        let message = builder.build()?;
        let client = WebPushClient::new()?;

        Ok(Box::new(
            client
                .send_with_timeout(message, Duration::from_secs(4))
                .from_err(),
        ))
    }

    match notify_result(todo, &info, ttl) {
        Ok(fut) => Either::A(fut.or_else(move |e: WebPushError| match e {
            WebPushError::Unauthorized
            | WebPushError::InvalidUri
            | WebPushError::EndpointNotValid
            | WebPushError::EndpointNotFound => {
                println!(
                    "Sending notification failed with error {:?}, unsubscribing endpoint {:?}",
                    e, info
                );
                Either::A(
                    db.send(Unsubscribe {
                        userid: userid,
                        endpoint: info.endpoint,
                    })
                    .from_err()
                    .and_then(|res| {
                        match res {
                            Ok(_) => (),
                            Err(e) => {
                                println!("Error {:?} while unsubscribing invalid subscription", e);
                            }
                        }
                        futures::future::err(e.into())
                    }),
                )
            }
            _ => Either::B(futures::future::err(e.into())),
        })),
        Err(e) => Either::B(futures::future::err(e.into())),
    }
}

fn push(a: &mut Push, ctx: &mut Context<Push>) {
    let since = a.last_notify;
    let now = Utc::now().naive_utc();
    a.last_notify = now;

    let ttl = a.ttl;

    let db = a.db.clone();
    let fut = db
        .send(GetNotifications {
            since: since,
            until: now,
        })
        .and_then(move |res| match res {
            Err(e) => Either::A(futures::future::ok(println!(
                "Error {:?} retrieving todos and subscriptions to notify",
                e
            ))),
            Ok(ts) => {
                Either::B(
                    futures::future::join_all(ts.into_iter().map(move |(todo, subscription)| {
                        let info = SubscriptionInfo {
                            endpoint: subscription.endpoint,
                            keys: SubscriptionKeys {
                                auth: subscription.auth,
                                p256dh: subscription.p256dh,
                            },
                        };
                        notify(todo, info, subscription.userid, db.clone(), ttl).or_else(|e| {
                            // must return ok or join_all will cancel other futures
                            println!("Error {:?} on notification", e);
                            futures::future::ok(())
                        })
                    }))
                    .map(|_| ()),
                )
            }
        });
    ctx.spawn(fut.map_err(|_| ()).into_actor(a));
}
