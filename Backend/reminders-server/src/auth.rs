use bcrypt::BcryptError;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const COST: u32 = 11;
const JWT_VALID_TIME: i64 = 7 * 24 * 60 * 60; // 7 days
const SECRET: &str = include_str!("../secrets/jwt_secret");

pub fn hash_password(password: &str) -> Result<String, BcryptError> {
    bcrypt::hash(password, COST)
}

pub fn check_password(password: &str, hash: &str) -> Result<bool, BcryptError> {
    bcrypt::verify(password, hash)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JWTPayload {
    userid: Uuid,
    iat: i64,
    exp: i64,
}

pub fn gen_jwt(userid: Uuid) -> anyhow::Result<String> {
    let now = chrono::Utc::now().timestamp();
    let payload = JWTPayload {
        userid,
        iat: now,
        exp: now + JWT_VALID_TIME,
    };
    encode(
        &Header::default(),
        &payload,
        &EncodingKey::from_secret(SECRET.as_bytes()),
    )
    .map_err(|e| e.into())
}

#[derive(Debug, Error)]
pub enum JWTVerifyError {
    #[error("invalid signature")]
    SignatureInvalid,
    #[error("invalid payload")]
    PayloadInvalid,
    #[error("token has expired")]
    Expired,
}

pub fn verify_jwt(jwt: &str) -> Result<Uuid, JWTVerifyError> {
    let validation = Validation::new(Algorithm::HS256);
    match decode::<JWTPayload>(
        jwt,
        &DecodingKey::from_secret(SECRET.as_bytes()),
        &validation,
    ) {
        Err(e) => match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => Err(JWTVerifyError::Expired),
            jsonwebtoken::errors::ErrorKind::Json(_) => Err(JWTVerifyError::PayloadInvalid),
            _ => Err(JWTVerifyError::SignatureInvalid),
        },
        Ok(data) => Ok(data.claims.userid),
    }
}
