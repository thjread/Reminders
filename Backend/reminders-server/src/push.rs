use actix::prelude::*;
use tokio::prelude::future::*;
use std::time::Duration;
use web_push::*;
use failure::Error;
use chrono::prelude::*;
use futures::future::Either;

use crate::database::{DbExecutor, GetNotifications, GetSubscriptions};

const PUSH_FREQUENCY: u64 = 10;
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

fn notify(info: SubscriptionInfo) -> impl Future<Item = (), Error = Error> {
    dbg!(&info);
    // TODO don't use unwrap
    let mut builder = WebPushMessageBuilder::new(&info).unwrap();
    builder.set_payload(ContentEncoding::AesGcm, "hi there".as_bytes());
    builder.set_ttl(10);

    let sig_builder = VapidSignatureBuilder::from_pem(PRIVATE_KEY.as_bytes(), &info).unwrap();
    let signature = sig_builder.build().unwrap();
    builder.set_vapid_signature(signature);

    let message = builder.build().unwrap();
    let client = WebPushClient::new().unwrap();

    client.send_with_timeout(message, Duration::from_secs(4)).map_err(|e| e.into())
        /*.map(|response| {
            println!("Sent: {:?}", response);
        }).map_err(|error| {
            println!("Error: {:?}", error);// TODO delete sub info on endpoint error
        })*/
}

fn push(a: &mut Push, ctx: &mut Context<Push>) {
    let db = a.db.clone();
    let fut = db.send(GetNotifications {
        since: a.last_notify,
        until: Utc::now().naive_utc(),
    }).from_err().and_then(move |t_res| match t_res {
        Err(e) => {
            Either::A(futures::future::ok(println!("Error {:?} retrieving todos to notify", e)))
        }
        Ok(todos) => {
            Either::B(db.send(GetSubscriptions)
                .from_err().and_then(|s_res| match s_res {
                    Err(e) => {
                        Either::A(futures::future::ok(println!("Error {:?} retrieving subscriptions", e)))
                    }
                    Ok(subs) => {
                        Either::B(futures::future::join_all(subs.into_iter().map(|s| {
                            let info = SubscriptionInfo {
                                endpoint: s.endpoint,
                                keys: SubscriptionKeys {
                                    auth: s.auth,
                                    p256dh: s.p256dh,
                                }
                            };
                            notify(info)
                        })).map(|_| ()))
                    }
                })
        )}
    });
    ctx.spawn(fut.map_err(|_| ()).into_actor(a));
}
