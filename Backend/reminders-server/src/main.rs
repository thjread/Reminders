use actix_cors::Cors;
use actix_web::{
    middleware::Compress, middleware::Logger, web, web::Json, App, HttpResponse, HttpServer,
};
use bigdecimal::Zero;
use chrono::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use dotenvy::dotenv;
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;
use web_push::SubscriptionInfo;

mod auth;
mod database;
mod models;
mod push;
mod schema;
mod serialize;

use auth::JWTVerifyError;
use database::UpdateAction;

const DEFAULT_PUSH_FREQUENCY: u64 = 5;
const DEFAULT_PUSH_TTL: u32 = 1200;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

struct AppState {
    pool: database::DbPool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRequest {
    jwt: String,
    batch: Vec<UpdateAction>,
    expected_hash: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
#[allow(non_camel_case_types)]
pub enum UpdateResult {
    INVALID_TOKEN,
    EXPIRED_TOKEN,
    SUCCESS,
    HASH_MISMATCH { todos: Vec<models::Todo>, hash: u64 },
}

async fn update(
    data: Json<UpdateRequest>,
    state: web::Data<AppState>,
) -> actix_web::Result<HttpResponse> {
    let UpdateRequest {
        jwt,
        batch: actions,
        expected_hash,
    } = data.into_inner();
    let userid = match auth::verify_jwt(&jwt) {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => {
            return Ok(HttpResponse::Ok().json(UpdateResult::INVALID_TOKEN));
        }
        Err(JWTVerifyError::Expired) => {
            return Ok(HttpResponse::Ok().json(UpdateResult::EXPIRED_TOKEN));
        }
        Ok(userid) => userid,
    };

    let len = actions.len();
    let pool = state.pool.clone();
    let hash = match web::block(move || database::update_batch(&pool, userid, actions)).await? {
        Ok(hash) => hash,
        Err(e) => {
            println!("[RUST] Error performing update {:?}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    if len > 0 {
        println!("[RUST] {} update actions from user {}", len, userid);
    }

    if hash == expected_hash {
        return Ok(HttpResponse::Ok().json(UpdateResult::SUCCESS));
    }
    let pool = state.pool.clone();
    match web::block(move || database::get_todos(&pool, userid)).await? {
        Ok(todos) => {
            println!(
                "[RUST] Sending todos with hash {} (user {})",
                hash, userid
            );
            Ok(HttpResponse::Ok().json(UpdateResult::HASH_MISMATCH { todos, hash }))
        }
        Err(e) => {
            println!("[RUST] Error fetching todos {:?}", e);
            Ok(HttpResponse::InternalServerError().finish())
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginDetails {
    username: String,
    password: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LoginResult {
    UsernameNotFound,
    IncorrectPassword,
    Success { userid: Uuid, jwt: String },
}

async fn login(
    details: Json<LoginDetails>,
    state: web::Data<AppState>,
) -> actix_web::Result<HttpResponse> {
    let LoginDetails { username, password } = details.into_inner();

    let pool = state.pool.clone();
    let username_ = username.clone();
    let user = match web::block(move || database::get_user(&pool, &username_)).await? {
        Err(e) => {
            println!("[RUST] Error {:?} logging in user", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
        Ok(None) => {
            return Ok(HttpResponse::Ok().json(LoginResult::UsernameNotFound));
        } // TODO rate limit this
        Ok(Some(user)) => user,
    };

    let hash = user.hash.clone();
    let password_ = password.clone();
    match web::block(move || auth::check_password(&password_, &hash)).await? {
        Err(e) => {
            println!("[RUST] Error {:?} checking user's password", e);
            Ok(HttpResponse::InternalServerError().finish())
        }
        Ok(valid) => {
            if valid {
                println!("[RUST] Login \"{}\" ({})", username, user.userid);
                let jwt =
                    auth::gen_jwt(user.userid).map_err(actix_web::error::ErrorInternalServerError)?;
                Ok(HttpResponse::Ok().json(LoginResult::Success {
                    userid: user.userid,
                    jwt,
                }))
            } else {
                Ok(HttpResponse::Ok().json(LoginResult::IncorrectPassword))
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SignupResult {
    UsernameTooLong,
    UsernameTaken,
    Success { userid: Uuid, jwt: String },
}

async fn signup(
    details: Json<LoginDetails>,
    state: web::Data<AppState>,
) -> actix_web::Result<HttpResponse> {
    let LoginDetails { username, password } = details.into_inner();
    if username.len() > 100 {
        return Ok(HttpResponse::Ok().json(SignupResult::UsernameTooLong));
    }

    let pool = state.pool.clone();
    let username_ = username.clone();
    match web::block(move || database::get_user(&pool, &username_)).await? {
        Err(e) => {
            println!(
                "[RUST] Error {:?} checking if username \"{}\" exists",
                e, username
            );
            return Ok(HttpResponse::InternalServerError().finish());
        }
        Ok(Some(_)) => {
            return Ok(HttpResponse::Ok().json(SignupResult::UsernameTaken));
        } // TODO rate limit this
        Ok(None) => {}
    }

    let hash = match web::block(move || auth::hash_password(&password)).await? {
        Err(e) => {
            println!("[RUST] Error {:?} hashing new user's password", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
        Ok(hash) => hash,
    };

    let userid = Uuid::new_v4();
    let user = models::User {
        userid,
        username: username.clone(),
        hash,
        signup: Utc::now().naive_utc(),
        todo_hash: Zero::zero(),
    };
    let pool = state.pool.clone();
    match web::block(move || database::signup(&pool, user)).await? {
        Err(e) => {
            println!("[RUST] Error {:?} signing up user", e);
            Ok(HttpResponse::InternalServerError().finish())
        }
        Ok(()) => {
            println!("[RUST] Signup \"{}\" ({})", username, userid);
            let jwt = auth::gen_jwt(userid).map_err(actix_web::error::ErrorInternalServerError)?;
            Ok(HttpResponse::Ok().json(SignupResult::Success { jwt, userid }))
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubscribeRequest {
    jwt: String,
    info: SubscriptionInfo,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
#[allow(non_camel_case_types)]
pub enum SubscribeResult {
    INVALID_TOKEN,
    EXPIRED_TOKEN,
    SUCCESS,
}

async fn subscribe(
    data: Json<SubscribeRequest>,
    state: web::Data<AppState>,
) -> actix_web::Result<HttpResponse> {
    let SubscribeRequest { jwt, info } = data.into_inner();
    let userid = match auth::verify_jwt(&jwt) {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => {
            return Ok(HttpResponse::Ok().json(SubscribeResult::INVALID_TOKEN));
        }
        Err(JWTVerifyError::Expired) => {
            return Ok(HttpResponse::Ok().json(SubscribeResult::EXPIRED_TOKEN));
        }
        Ok(userid) => userid,
    };

    let sub = models::Subscription {
        userid,
        endpoint: info.endpoint,
        auth: info.keys.auth,
        p256dh: info.keys.p256dh,
    };
    let pool = state.pool.clone();
    match web::block(move || database::subscribe(&pool, sub)).await? {
        Ok(()) => {
            println!("[RUST] Notification subscription from {}", userid);
            Ok(HttpResponse::Ok().json(SubscribeResult::SUCCESS))
        }
        Err(e) => {
            println!(
                "[RUST] Error {:?} registering push notification subscription",
                e
            );
            Ok(HttpResponse::InternalServerError().finish())
        }
    }
}

async fn unsubscribe(
    data: Json<SubscribeRequest>,
    state: web::Data<AppState>,
) -> actix_web::Result<HttpResponse> {
    let SubscribeRequest { jwt, info } = data.into_inner();
    let userid = match auth::verify_jwt(&jwt) {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => {
            return Ok(HttpResponse::Ok().json(SubscribeResult::INVALID_TOKEN));
        }
        Err(JWTVerifyError::Expired) => {
            return Ok(HttpResponse::Ok().json(SubscribeResult::EXPIRED_TOKEN));
        }
        Ok(userid) => userid,
    };

    let pool = state.pool.clone();
    match web::block(move || database::unsubscribe(&pool, userid, info.endpoint)).await? {
        Ok(()) => {
            println!("[RUST] Notification unsubscription from {}", userid);
            Ok(HttpResponse::Ok().json(SubscribeResult::SUCCESS))
        }
        Err(e) => {
            println!("[RUST] Error {:?} while unsubscribing", e);
            Ok(HttpResponse::InternalServerError().finish())
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=warn");
    env_logger::init();

    dotenv().ok();

    let frequency = match env::var("PUSH_FREQUENCY").ok().and_then(|v| v.parse().ok()) {
        Some(n) => n,
        None => DEFAULT_PUSH_FREQUENCY,
    };
    let ttl = match env::var("PUSH_TTL").ok().and_then(|v| v.parse().ok()) {
        Some(n) => n,
        None => DEFAULT_PUSH_TTL,
    };

    let pool = database::establish_connection();
    pool.get()
        .unwrap()
        .run_pending_migrations(MIGRATIONS)
        .expect("Failed to apply migrations");

    actix_web::rt::spawn(push::push_loop(pool.clone(), frequency, ttl));

    let server = HttpServer::new(move || {
        let cors = if cfg!(debug_assertions) {
            Cors::default()
                .allowed_origin("http://localhost:8000")
                .allow_any_header()
                .allow_any_method()
        } else {
            // the API is only served same-origin behind nginx in production;
            // permissive matches the behaviour of the old actix-cors 0.1 default
            Cors::permissive()
        };

        let app = App::new()
            .app_data(web::Data::new(AppState { pool: pool.clone() }))
            .wrap(Logger::new("%r %b %D"))
            .wrap(Compress::default())
            .wrap(cors);

        app.service(
            web::scope("/api")
                .service(web::resource("/update").route(web::put().to(update)))
                .service(web::resource("/login").route(web::post().to(login)))
                .service(web::resource("/signup").route(web::post().to(signup)))
                .service(web::resource("/subscribe").route(web::post().to(subscribe)))
                .service(web::resource("/unsubscribe").route(web::delete().to(unsubscribe))),
        )
    });

    println!("Started server");

    server.bind("0.0.0.0:3000")?.run().await
}
