use rand::prelude::*;
use rand::distributions::Uniform;
use bcrypt::{hash, verify};
use base64;

const COST: u32 = 10;

pub struct PasswordHash {
    pub hash: String,
    pub salt: String
}

pub fn hash_password(password: String) -> PasswordHash {
    let password_bytes = password.as_bytes();
    let salt_bytes: Vec<u8> = rand::thread_rng()
        .sample_iter(&Uniform::new_inclusive(1u8, 255u8))
        .take(32).collect();
    let salted_bytes: Vec<u8> = password_bytes.iter().chain(salt_bytes.iter()).cloned().collect();
    let hash_string = hash(&salted_bytes, COST).expect("Failed to hash password");
    PasswordHash {
        hash: hash_string,
        salt: base64::encode(&salt_bytes[..]),
    }
}
