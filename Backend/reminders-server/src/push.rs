use chrono::prelude::*;
use futures::future::join_all;
use serde::Serialize;
use std::time::Duration;
use uuid::Uuid;
use web_push::*;

use crate::database::{self, DbPool};
use crate::models::Todo;

const PRIVATE_KEY: &str = include_str!("../secrets/private_key.pem");
const SEND_TIMEOUT: Duration = Duration::from_secs(4);

#[derive(Serialize)]
struct PushPayload {
    id: Uuid,
    userid: Uuid,
    title: String,
    deadline: Option<NaiveDateTime>,
}

/// Every `frequency` seconds, notify subscribers of todos whose deadline
/// passed since the previous tick.
pub async fn push_loop(pool: DbPool, frequency: u64, ttl: u32) {
    let client = HyperWebPushClient::new();
    let mut last_notify = Utc::now().naive_utc() - chrono::Duration::minutes(1);
    let mut interval = tokio::time::interval(Duration::from_secs(frequency));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        interval.tick().await;

        let since = last_notify;
        let now = Utc::now().naive_utc();
        last_notify = now;

        let pool_ = pool.clone();
        let notifications = match tokio::task::spawn_blocking(move || {
            database::get_notifications(&pool_, since, now)
        })
        .await
        {
            Ok(Ok(ts)) => ts,
            Ok(Err(e)) => {
                println!(
                    "[RUST] Error {:?} retrieving todos and subscriptions to notify",
                    e
                );
                continue;
            }
            Err(e) => {
                println!("[RUST] Panic {:?} retrieving todos and subscriptions", e);
                continue;
            }
        };

        join_all(notifications.into_iter().map(|(todo, subscription)| {
            let info = SubscriptionInfo {
                endpoint: subscription.endpoint,
                keys: SubscriptionKeys {
                    auth: subscription.auth,
                    p256dh: subscription.p256dh,
                },
            };
            let pool = pool.clone();
            let client = &client;
            async move {
                if let Err(e) = notify(client, todo, info, subscription.userid, pool, ttl).await {
                    println!("[RUST] Error {:?} on notification", e);
                }
            }
        }))
        .await;
    }
}

async fn notify(
    client: &HyperWebPushClient,
    todo: Todo,
    info: SubscriptionInfo,
    userid: Uuid,
    pool: DbPool,
    ttl: u32,
) -> anyhow::Result<()> {
    println!("[RUST] Sending push notification to user {}", userid);

    let payload = PushPayload {
        id: todo.id,
        userid: todo.userid,
        title: todo.title,
        deadline: todo.deadline,
    };
    let payload_json = serde_json::to_string(&payload)?;

    let mut builder = WebPushMessageBuilder::new(&info);
    builder.set_payload(ContentEncoding::Aes128Gcm, payload_json.as_bytes());
    builder.set_ttl(ttl);
    let signature = VapidSignatureBuilder::from_pem(PRIVATE_KEY.as_bytes(), &info)?.build()?;
    builder.set_vapid_signature(signature);
    let message = builder.build()?;

    let result = match tokio::time::timeout(SEND_TIMEOUT, client.send(message)).await {
        Ok(result) => result,
        Err(_) => anyhow::bail!("timed out sending notification to user {}", userid),
    };

    match result {
        Ok(_) => Ok(()),
        Err(
            e @ (WebPushError::Unauthorized(_)
            | WebPushError::InvalidUri
            | WebPushError::EndpointNotValid(_)
            | WebPushError::EndpointNotFound(_)),
        ) => {
            println!(
                "[RUST] Error {:?} sending notification, unsubscribing endpoint {:?}",
                e, info
            );
            let endpoint = info.endpoint.clone();
            match tokio::task::spawn_blocking(move || {
                database::unsubscribe(&pool, userid, endpoint)
            })
            .await
            {
                Ok(Ok(())) => {}
                Ok(Err(e)) => println!(
                    "[RUST] Error {:?} while unsubscribing invalid subscription",
                    e
                ),
                Err(e) => println!("[RUST] Panic {:?} while unsubscribing", e),
            }
            Err(e.into())
        }
        Err(e) => Err(e.into()),
    }
}
