use actix::prelude::*;
use tokio::prelude::future::*;
use std::time::Duration;
use web_push::*;
use failure::Error;

const info_json: &'static str = r#"{"endpoint":"https://updates.push.services.mozilla.com/wpush/v2/gAAAAABcZ857Ak6F76_07CkFnkyG5XdwHLa2dJezHa4rrVMzEAvpYPQxEPxvVsJ3h08dcWk60v-pitA_tbtiFf2KG_QmjRNI6nGtaOikwCsg2YyUer6sDn-2uw_wuYNfra4vRP9GWV_JjZeqIxulKm58QzPVhj4YFT4Ai4hX3Fln_KlA9JYkdqs","keys":{"auth":"-rgPEoFoTKgQosEi3MR-Ow","p256dh":"BBU8jn3JvnL2F_DptbDDn5d_U2Vyn2Cxuy90XWSFAuaae5Ms9NEh2U3eFemPwjY2ILuBWqzTRccvmhIwjMJoz9g"}}"#;

const PUSH_FREQUENCY: u64 = 10;
const PRIVATE_KEY: &'static str = include_str!("../secrets/private_key.pem");

pub struct Push;

impl Actor for Push {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        ctx.run_interval(Duration::new(PUSH_FREQUENCY, 0), |_, _| {
            push().ok();
        });
    }
}

fn push() -> Result<(), Error> {
    let info: SubscriptionInfo = serde_json::from_str(info_json)?;// TODO don't use unwrap
    let mut builder = WebPushMessageBuilder::new(&info)?;
    builder.set_payload(ContentEncoding::AesGcm, "hi there".as_bytes());
    builder.set_ttl(10);

    let sig_builder = VapidSignatureBuilder::from_pem(PRIVATE_KEY.as_bytes(), &info)?;
    let signature = sig_builder.build()?;
    builder.set_vapid_signature(signature);

    let message = builder.build()?;
    let client = WebPushClient::new()?;

    tokio::spawn(lazy(move || {
        client
            .send_with_timeout(message, Duration::from_secs(4))
            .map(|response| {
                println!("Sent: {:?}", response);
            }).map_err(|error| {
                println!("Error: {:?}", error)// TODO delete sub info on endpoint error
            })
    }));

    println!("TODO push");
    Ok(())
}
