use actix::prelude::*;
use tokio::prelude::future::*;
use std::time::Duration;
use web_push::*;

const info_json: &'static str = r#"{"endpoint":"https://updates.push.services.mozilla.com/wpush/v2/gAAAAABcZyHvCQHYz_Nt3uBAhrCKHjtQA83fiAuVZHQ-ACtpELWGJRczRXOzttzZZytCtkBqkiS5KMyAdxnAb62X8qeftBuruo57OJTBOLwdNQFbDlVzQCnWbIiy_GibMocREtDN-Ig3KlzFTohP-01vqd6BrhWBTtMx29qAIB3peswrLLuAv4w","keys":{"auth":"RkeqkT6aAUxory3fGIMbiA","p256dh":"BH0KmAfodEQr3nUcnojwF9vBaKxmxvi-YnYQy0xTosI5Trb61tX5xbtMmfSIRkQDDxlJ3XkVdzE455fKszslvuc"}}"#;

const PUSH_FREQUENCY: u64 = 10;
const PRIVATE_KEY: &'static str = include_str!("../secrets/private_key.pem");

pub struct Push;

impl Actor for Push {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        ctx.run_interval(Duration::new(PUSH_FREQUENCY, 0), push);
    }
}

// TODO deal with errors properly
fn push(_act: &mut Push, _ctx: &mut Context<Push>) {
    let info: SubscriptionInfo = serde_json::from_str(info_json).unwrap();// TODO don't use unwrap
    let mut builder = WebPushMessageBuilder::new(&info).unwrap();
    builder.set_payload(ContentEncoding::AesGcm, "hi there".as_bytes());
    builder.set_ttl(10);

    let mut sig_builder = VapidSignatureBuilder::from_pem(PRIVATE_KEY.as_bytes(), &info).unwrap();
    let signature = sig_builder.build().unwrap();
    builder.set_vapid_signature(signature);

    let message = builder.build().unwrap();
    let client = WebPushClient::new().unwrap();

    tokio::spawn(lazy(move || {
        client
            .send_with_timeout(message, Duration::from_secs(4))
            .map(|response| {
                println!("Sent: {:?}", response);
            }).map_err(|error| {
                println!("Error: {:?}", error)
            })
    }));

    println!("TODO push");
}
