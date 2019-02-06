use bcrypt::BcryptError;
use frank_jwt;
use frank_jwt::Algorithm::HS256;
use uuid::Uuid;
use serde_derive::{Serialize, Deserialize};
use actix::prelude::*;

const COST: u32 = 11;
const JWT_VALID_TIME: i64 = 7*24*60*60;// 7 weeks

pub struct HashExecutor();

impl Actor for HashExecutor {
    type Context = Context<Self>;
}

pub struct Hash(pub String);

impl Message for Hash {
    type Result = Result<String, BcryptError>;
}

impl Handler<Hash> for HashExecutor {
    type Result = Result<String, BcryptError>;

    fn handle(&mut self, Hash(password): Hash, _: &mut Self::Context) -> Self::Result {
        bcrypt::hash(&password, COST)
    }
}

pub struct CheckHash{
    pub password: String,
    pub hash: String,
}

impl Message for CheckHash {
    type Result = Result<bool, BcryptError>;
}

impl Handler<CheckHash> for HashExecutor {
    type Result = Result<bool, BcryptError>;

    fn handle(&mut self, msg: CheckHash, _: &mut Self::Context) -> Self::Result {
        bcrypt::verify(msg.password, &msg.hash)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JWTPayload {
    userid: Uuid,
    iat: i64,
}

pub fn gen_jwt(userid: Uuid) -> String {
    let payload = serde_json::to_value(JWTPayload {
        userid: userid,
        iat: chrono::Utc::now().timestamp(),
    }).expect("Failed to convert JWT payload to JSON");
    let header = json!({});
    let secret = "secret";// TODO
    frank_jwt::encode(header, &secret.to_string(), &payload, HS256).expect("Failed to create JWT")
}

pub enum JWTError  {
    SignatureInvalid,
    PayloadInvalid,
    Expired,
}

pub fn verify_jwt(jwt: &String) -> Result<Uuid, JWTError> {
    match frank_jwt::decode(jwt, &"secret".to_string(), HS256) {
        Err(_) => Err(JWTError::SignatureInvalid),
        Ok((_, p)) => {
            match serde_json::from_value::<JWTPayload>(p) {
                Err(_) => Err(JWTError::PayloadInvalid),
                Ok(payload) => {
                    if chrono::Utc::now().timestamp() - payload.iat < JWT_VALID_TIME {
                        Ok(payload.userid)
                    } else {
                        Err(JWTError::Expired)
                    }
                }
            }
        }
    }
}
