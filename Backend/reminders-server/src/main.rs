extern crate actix_web;
extern crate env_logger;
#[macro_use]
extern crate diesel;
extern crate chrono;
extern crate serde_derive;
extern crate uuid;
#[macro_use]
extern crate serde_json;
extern crate bcrypt;
extern crate dotenv;
extern crate frank_jwt;
extern crate futures;
#[macro_use]
extern crate failure;
#[macro_use]
extern crate diesel_migrations;
extern crate bigdecimal;
extern crate tokio;
extern crate twox_hash;
extern crate web_push;

use actix::prelude::*;
use actix_web::{
    middleware::cors::Cors, middleware::Compress, middleware::Logger, web, web::Json, App, Error,
    HttpRequest, HttpResponse, HttpServer,
};
use bigdecimal::Zero;
use chrono::prelude::*;
use dotenv::dotenv;
use futures::future::Either;
use futures::Future;
use serde_derive::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;
use web_push::SubscriptionInfo;

mod auth;
mod database;
mod models;
mod push;
mod schema;
mod serialize;

use auth::{CheckHash, Hash, HashExecutor, JWTVerifyError};
use database::{
    DbExecutor, GetTodos, GetUser, Signup, Subscribe, Unsubscribe, UpdateAction, UpdateBatch,
};
use push::Push;

const DEFAULT_DB_THREADS: usize = 2;
const DEFAULT_HASH_THREADS: usize = 2;
const DEFAULT_PUSH_FREQUENCY: u64 = 5;
const DEFAULT_PUSH_TTL: u32 = 1200;

struct AppState {
    db: Addr<DbExecutor>,
    hash: Addr<HashExecutor>,
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

fn update(
    data: Json<UpdateRequest>,
    req: HttpRequest,
) -> impl Future<Item = HttpResponse, Error = Error> {
    let jwt_result = auth::verify_jwt(&data.0.jwt);
    match jwt_result {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => Either::A(
            futures::future::ok(HttpResponse::Ok().json(UpdateResult::INVALID_TOKEN)),
        ),
        Err(JWTVerifyError::Expired { .. }) => Either::A(futures::future::ok(
            HttpResponse::Ok().json(UpdateResult::EXPIRED_TOKEN),
        )),
        Ok(userid) => {
            let actions = data.0.batch;
            let expected_hash = data.0.expected_hash;
            let len = actions.len();
            let data = req
                .get_app_data::<AppState>()
                .expect("App state not available");
            Either::B(
                data
                .db
                .send(UpdateBatch(userid, actions))
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))
                .and_then(move |res| match res {
                    Ok(hash) => Either::A({
                        if len > 0 {
                            println!("[RUST] {} update actions from user {}", len, userid);
                        }
                        if hash == expected_hash {
                            Either::A(futures::future::ok(HttpResponse::Ok().json(UpdateResult::SUCCESS)))
                        } else {
                            Either::B(
                                data
                                .db
                                .send(GetTodos(userid))
                                .map_err(|e| actix_web::error::ErrorInternalServerError(e))
                                .and_then(move |res| match res {
                                    Ok(todos) => {
                                        println!("[RUST] Sending todos with hash {} (user {})", hash, userid);
                                        Ok(HttpResponse::Ok().json(UpdateResult::HASH_MISMATCH {
                                            todos,
                                            hash,
                                        }))
                                    }
                                    Err(e) => {
                                        println!("[RUST] Error fetching todos {:?}", e);
                                        Ok(HttpResponse::InternalServerError().into())
                                    }
                                }))
                        }
                    }),
                    Err(e) => {
                        println!("[RUST] Error performing update {:?}", e);
                        Either::B(futures::future::ok(HttpResponse::InternalServerError().into()))
                    }
                }))
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

fn login(
    details: Json<LoginDetails>,
    req: HttpRequest,
) -> impl Future<Item = HttpResponse, Error = Error> {
    println!("hi");
    let data = req
        .get_app_data::<AppState>()
        .expect("App state not available");
    data.db
        .send(GetUser(details.0.username.clone()))
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))
        .and_then(move |res| {
            match res {
                Err(e) => {
                    println!("[RUST] Error {:?} logging in user", e);
                    Either::A(futures::future::ok(
                        HttpResponse::InternalServerError().into(),
                    ))
                }
                Ok(None) => Either::A(futures::future::ok(
                    HttpResponse::Ok().json(LoginResult::UsernameNotFound),
                )), // TODO rate limit this
                Ok(Some(user)) => Either::B(
                    data.hash
                        .send(CheckHash {
                            password: details.0.password.clone(),
                            hash: user.hash.clone(),
                        })
                        .map_err(|e| actix_web::error::ErrorInternalServerError(e))
                        .and_then(move |res| match res {
                            Err(e) => {
                                println!("[RUST] Error {:?} checking user's password", e);
                                Ok(HttpResponse::InternalServerError().into())
                            }
                            Ok(valid) => {
                                if valid {
                                    println!(
                                        "[RUST] Login \"{}\" ({})",
                                        details.0.username, user.userid
                                    );
                                    let jwt = auth::gen_jwt(user.userid)?;
                                    Ok(HttpResponse::Ok().json(LoginResult::Success {
                                        userid: user.userid,
                                        jwt,
                                    }))
                                } else {
                                    Ok(HttpResponse::Ok().json(LoginResult::IncorrectPassword))
                                }
                            }
                        }),
                ),
            }
        })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SignupResult {
    UsernameTooLong,
    UsernameTaken,
    Success { userid: Uuid, jwt: String },
}

fn signup(
    details: Json<LoginDetails>,
    req: HttpRequest,
) -> impl Future<Item = HttpResponse, Error = Error> {
    if details.username.len() > 100 {
        return Either::A(futures::future::ok(
            HttpResponse::Ok().json(SignupResult::UsernameTooLong),
        ));
    }
    let data = req
        .get_app_data::<AppState>()
        .expect("App state not available");
    Either::B(
        data.db
            .send(GetUser(details.0.username.clone()))
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))
            .and_then(move |res| {
                match res {
                    Err(e) => {
                        println!(
                            "[RUST] Error {:?} checking if username \"{}\" exists",
                            e,
                            details.0.username.clone()
                        );
                        Either::A(futures::future::ok(
                            HttpResponse::InternalServerError().into(),
                        ))
                    }
                    Ok(Some(_)) => Either::A(futures::future::ok(
                        HttpResponse::Ok().json(SignupResult::UsernameTaken),
                    )), // TODO rate limit this
                    Ok(None) => Either::B(
                        data.hash
                            .send(Hash(details.0.password.clone()))
                            .map_err(|e| actix_web::error::ErrorInternalServerError(e))
                            .and_then(move |res| match res {
                                Err(e) => {
                                    println!("[RUST] Error {:?} hashing new user's password", e);
                                    Either::A(futures::future::ok(
                                        HttpResponse::InternalServerError().into(),
                                    ))
                                }
                                Ok(hash) => {
                                    let userid = Uuid::new_v4();
                                    Either::B(
                                        data.db
                                            .send(Signup(models::User {
                                                userid,
                                                username: details.0.username.clone(),
                                                hash,
                                                signup: Utc::now().naive_utc(),
                                                todo_hash: Zero::zero(),
                                            }))
                                            .map_err(|e| {
                                                actix_web::error::ErrorInternalServerError(e)
                                            })
                                            .and_then(move |res| match res {
                                                Err(e) => {
                                                    println!(
                                                        "[RUST] Error {:?} signing up user",
                                                        e
                                                    );
                                                    Ok(HttpResponse::InternalServerError().into())
                                                }
                                                Ok(_) => {
                                                    println!(
                                                        "[RUST] Signup \"{}\" ({})",
                                                        details.0.username, userid
                                                    );
                                                    let jwt = auth::gen_jwt(userid)?;
                                                    Ok(HttpResponse::Ok().json(
                                                        SignupResult::Success { jwt, userid },
                                                    ))
                                                }
                                            }),
                                    )
                                }
                            }),
                    ),
                }
            }),
    )
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

fn subscribe(
    data: Json<SubscribeRequest>,
    req: HttpRequest,
) -> impl Future<Item = HttpResponse, Error = Error> {
    let jwt_result = auth::verify_jwt(&data.0.jwt);
    match jwt_result {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => Either::A(
            futures::future::ok(HttpResponse::Ok().json(SubscribeResult::INVALID_TOKEN)),
        ),
        Err(JWTVerifyError::Expired { .. }) => Either::A(futures::future::ok(
            HttpResponse::Ok().json(SubscribeResult::EXPIRED_TOKEN),
        )),
        Ok(userid) => {
            let info = data.0.info;
            let sub = models::Subscription {
                userid,
                endpoint: info.endpoint,
                auth: info.keys.auth,
                p256dh: info.keys.p256dh,
            };
            let data = req.app_data::<AppState>().expect("App state not available");
            Either::B(
                data.db
                    .send(Subscribe(sub))
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))
                    .and_then(move |res| match res {
                        Ok(_) => {
                            println!("[RUST] Notification subscription from {}", userid);
                            Ok(HttpResponse::Ok().json(SubscribeResult::SUCCESS))
                        }
                        Err(e) => {
                            println!(
                                "[RUST] Error {:?} registering push notification subscription",
                                e
                            );
                            Ok(HttpResponse::InternalServerError().into())
                        }
                    }),
            )
        }
    }
}

fn unsubscribe(
    data: Json<SubscribeRequest>,
    req: HttpRequest,
) -> impl Future<Item = HttpResponse, Error = Error> {
    let jwt_result = auth::verify_jwt(&data.0.jwt);
    match jwt_result {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => Either::A(
            futures::future::ok(HttpResponse::Ok().json(SubscribeResult::INVALID_TOKEN)),
        ),
        Err(JWTVerifyError::Expired { .. }) => Either::A(futures::future::ok(
            HttpResponse::Ok().json(SubscribeResult::EXPIRED_TOKEN),
        )),
        Ok(userid) => {
            let info = data.0.info;
            let data = req.app_data::<AppState>().expect("App state not available");
            Either::B(
                data.db
                    .send(Unsubscribe {
                        userid,
                        endpoint: info.endpoint,
                    })
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))
                    .and_then(move |res| match res {
                        Ok(_) => {
                            println!("[RUST] Notification unsubscription from {}", userid);
                            Ok(HttpResponse::Ok().json(SubscribeResult::SUCCESS))
                        }
                        Err(e) => {
                            println!("[RUST] Error {:?} while unsubscribing", e);
                            Ok(HttpResponse::InternalServerError().into())
                        }
                    }),
            )
        }
    }
}

embed_migrations!("./migrations/");

fn main() {
    std::env::set_var("RUST_LOG", "actix_web=warn");
    env_logger::init();

    dotenv().ok();

    let db_threads = match env::var("DB_THREADS").ok().and_then(|v| v.parse().ok()) {
        Some(n) => n,
        None => DEFAULT_DB_THREADS,
    };
    let hash_threads = match env::var("HASH_THREADS").ok().and_then(|v| v.parse().ok()) {
        Some(n) => n,
        None => DEFAULT_HASH_THREADS,
    };
    let frequency = match env::var("PUSH_FREQUENCY").ok().and_then(|v| v.parse().ok()) {
        Some(n) => n,
        None => DEFAULT_PUSH_FREQUENCY,
    };
    let ttl = match env::var("PUSH_TTL").ok().and_then(|v| v.parse().ok()) {
        Some(n) => n,
        None => DEFAULT_PUSH_TTL,
    };

    let sys = actix::System::new("reminders-server");

    let pool = database::establish_connection();
    embedded_migrations::run(&pool.get().unwrap()).expect("Failed to apply migrations");
    let db_addr = SyncArbiter::start(db_threads, move || DbExecutor(pool.clone()));
    let hash_addr = SyncArbiter::start(hash_threads, HashExecutor);

    let p = Push {
        last_notify: Utc::now().naive_utc() - chrono::Duration::minutes(1),
        db: db_addr.clone(),
        frequency,
        ttl,
    };
    p.start();

    let server = HttpServer::new(move || {
        let cors = if cfg!(debug_assertions) {
            Cors::new().allowed_origin("http://localhost:8000")
        } else {
            Cors::new()
        };

        let app = App::new()
            .data(AppState {
                db: db_addr.clone(),
                hash: hash_addr.clone(),
            })
            .wrap(Logger::new("%r %b %D"))
            .wrap(Compress::default())
            .wrap(cors);

        app.service(
            web::scope("/api")
                .service(web::resource("/update").route(web::put().to_async(update)))
                .service(web::resource("/login").route(web::post().to_async(login)))
                .service(web::resource("/signup").route(web::post().to_async(signup)))
                .service(web::resource("/subscribe").route(web::post().to_async(subscribe)))
                .service(web::resource("/unsubscribe").route(web::delete().to_async(unsubscribe))),
        )
    });
    server.bind("0.0.0.0:3000").unwrap().start();

    println!("Started server");

    let _ = sys.run();
}
