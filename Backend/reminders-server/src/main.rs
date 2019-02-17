extern crate actix;
extern crate actix_web;
extern crate env_logger;
extern crate listenfd;
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
extern crate tokio;
extern crate web_push;

use actix::prelude::*;
use actix_web::{
    http, middleware::cors::Cors, middleware::Logger, server, App, AsyncResponder, Error,
    HttpRequest, HttpResponse, Json,
};
use chrono::prelude::*;
use futures::future::Either;
use futures::Future;
use listenfd::ListenFd;
use serde_derive::{Deserialize, Serialize};
use uuid::Uuid;
use web_push::SubscriptionInfo;

mod auth;
mod database;
mod models;
mod push;
mod schema;

use auth::{CheckHash, Hash, HashExecutor, JWTVerifyError};
use database::{DbExecutor, GetUser, Signup, UpdateAction, UpdateBatch, Subscribe, Unsubscribe };
use push::Push;

struct AppState {
    db: Addr<DbExecutor>,
    hash: Addr<HashExecutor>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRequest {
    jwt: String,
    batch: Vec<UpdateAction>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
#[allow(non_camel_case_types)]
pub enum UpdateResult {
    INVALID_TOKEN,
    EXPIRED_TOKEN,
    SUCCESS { todos: Vec<models::Todo> },
}

fn update(
    (req, data): (HttpRequest<AppState>, Json<UpdateRequest>),
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    let jwt_result = auth::verify_jwt(&data.0.jwt);
    match jwt_result {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => {
            futures::future::ok(HttpResponse::Ok().json(UpdateResult::INVALID_TOKEN)).responder()
        }
        Err(JWTVerifyError::Expired { time: _ }) => {
            futures::future::ok(HttpResponse::Ok().json(UpdateResult::EXPIRED_TOKEN)).responder()
        }
        Ok(userid) => {
            let actions = data.0.batch;
            req.state()
                .db
                .send(UpdateBatch(userid, actions))
                .from_err()
                .and_then(|res| match res {
                    Ok(todos) => {
                        Ok(HttpResponse::Ok().json(UpdateResult::SUCCESS { todos: todos }))
                    }
                    Err(e) => {
                        println!("Error performing update {:?}", e);
                        Ok(HttpResponse::InternalServerError().into())
                    }
                })
                .responder()
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
    (req, details): (HttpRequest<AppState>, Json<LoginDetails>),
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    req.state()
        .db
        .send(GetUser(details.0.username.clone()))
        .from_err()
        .and_then(move |res| {
            match res {
                Err(e) => {
                    dbg!(e);
                    Either::A(futures::future::ok(
                        HttpResponse::InternalServerError().into(),
                    ))
                }
                Ok(None) => Either::A(futures::future::ok(
                    HttpResponse::Ok().json(LoginResult::UsernameNotFound),
                )), // TODO rate limit this
                Ok(Some(user)) => Either::B(
                    req.state()
                        .hash
                        .send(CheckHash {
                            password: details.0.password,
                            hash: user.hash.clone(),
                        })
                        .from_err()
                        .and_then(move |res| match res {
                            Err(e) => {
                                dbg!(e);
                                Ok(HttpResponse::InternalServerError().into())
                            }
                            Ok(valid) => {
                                if valid {
                                    let jwt = auth::gen_jwt(user.userid.clone())?;
                                    Ok(HttpResponse::Ok().json(LoginResult::Success {
                                        userid: user.userid,
                                        jwt: jwt,
                                    }))
                                } else {
                                    Ok(HttpResponse::Ok().json(LoginResult::IncorrectPassword))
                                }
                            }
                        }),
                ),
            }
        })
        .responder()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SignupResult {
    UsernameTooLong,
    UsernameTaken,
    Success { userid: Uuid, jwt: String },
}

fn signup(
    (req, details): (HttpRequest<AppState>, Json<LoginDetails>),
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    if details.username.len() > 100 {
        return futures::future::ok(HttpResponse::Ok().json(SignupResult::UsernameTooLong))
            .responder();
    }
    req.state()
        .db
        .send(GetUser(details.0.username.clone()))
        .from_err()
        .and_then(move |res| {
            match res {
                Err(e) => {
                    dbg!(e);
                    Either::A(futures::future::ok(
                        HttpResponse::InternalServerError().into(),
                    ))
                }
                Ok(Some(_)) => Either::A(futures::future::ok(
                    HttpResponse::Ok().json(SignupResult::UsernameTaken),
                )), // TODO rate limit this
                Ok(None) => Either::B(
                    req.state()
                        .hash
                        .send(Hash(details.0.password.clone()))
                        .from_err()
                        .and_then(move |res| match res {
                            Err(e) => {
                                dbg!(e);
                                Either::A(futures::future::ok(
                                    HttpResponse::InternalServerError().into(),
                                ))
                            }
                            Ok(hash) => {
                                let userid = Uuid::new_v4();
                                Either::B(
                                    req.state()
                                        .db
                                        .send(Signup(models::User {
                                            userid: userid,
                                            username: details.0.username,
                                            hash: hash,
                                            signup: Utc::now().naive_utc(),
                                        }))
                                        .from_err()
                                        .and_then(move |res| match res {
                                            Err(e) => {
                                                dbg!(e);
                                                Ok(HttpResponse::InternalServerError().into())
                                            }
                                            Ok(_) => {
                                                let jwt = auth::gen_jwt(userid)?;
                                                Ok(HttpResponse::Ok().json(SignupResult::Success {
                                                    jwt: jwt,
                                                    userid: userid,
                                                }))
                                            }
                                        }),
                                )
                            }
                        }),
                ),
            }
        })
        .responder()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubscribeRequest {
    jwt: String,
    info: SubscriptionInfo
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
    (req, data): (HttpRequest<AppState>, Json<SubscribeRequest>),
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    let jwt_result = auth::verify_jwt(&data.0.jwt);
    match jwt_result {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => {
            futures::future::ok(HttpResponse::Ok().json(SubscribeResult::INVALID_TOKEN)).responder()
        }
        Err(JWTVerifyError::Expired { time: _ }) => {
            futures::future::ok(HttpResponse::Ok().json(SubscribeResult::EXPIRED_TOKEN)).responder()
        }
        Ok(userid) => {
            let info = data.0.info;
            let sub = models::Subscription {
                userid: userid,
                endpoint: info.endpoint,
                auth: info.keys.auth,
                p256dh: info.keys.p256dh,
            };
            req.state().db.send(Subscribe(sub))
                .from_err()
                .and_then(|res| match res {
                    Ok(_) => {
                        Ok(HttpResponse::Ok().json(SubscribeResult::SUCCESS))
                    }
                    Err(e) => {
                        dbg!(e);
                        Ok(HttpResponse::InternalServerError().into())
                    }
                })
                .responder()
        }
    }
}

fn unsubscribe(
    (req, data): (HttpRequest<AppState>, Json<SubscribeRequest>),
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    let jwt_result = auth::verify_jwt(&data.0.jwt);
    match jwt_result {
        Err(JWTVerifyError::SignatureInvalid) | Err(JWTVerifyError::PayloadInvalid) => {
            futures::future::ok(HttpResponse::Ok().json(SubscribeResult::INVALID_TOKEN)).responder()
        }
        Err(JWTVerifyError::Expired { time: _ }) => {
            futures::future::ok(HttpResponse::Ok().json(SubscribeResult::EXPIRED_TOKEN)).responder()
        }
        Ok(userid) => {
            let info = data.0.info;
            req.state().db.send(Unsubscribe {
                userid: userid,
                endpoint: info.endpoint,
            })
                .from_err()
                .and_then(|res| match res {
                    Ok(_) => {
                        Ok(HttpResponse::Ok().json(SubscribeResult::SUCCESS))
                    }
                    Err(e) => {
                        println!("Error {:?} while unsubscribing", e);
                        Ok(HttpResponse::InternalServerError().into())
                    }
                })
                .responder()
        }
    }
}

embed_migrations!("./migrations/");

fn main() {
    std::env::set_var("RUST_LOG", "actix_web=INFO");
    env_logger::init();

    let mut listenfd = ListenFd::from_env();
    let sys = actix::System::new("reminders-server");

    let pool = database::establish_connection();
    embedded_migrations::run(&pool.get().unwrap()).expect("Failed to apply migrations");
    let db_addr = SyncArbiter::start(2, move || DbExecutor(pool.clone()));
    let hash_addr = SyncArbiter::start(2, move || HashExecutor());

    let p = Push{
        last_notify: Utc::now().naive_utc() - chrono::Duration::minutes(1),
        db: db_addr.clone(),
    };
    p.start();

    let mut server = server::new(move || {
        let app = App::with_state(AppState {
            db: db_addr.clone(),
            hash: hash_addr.clone(),
        })
        .middleware(Logger::new("%r %b %D"))
        .prefix("/api");

        if cfg!(debug_assertions) {
            app.configure(|app| {
                Cors::for_app(app)
                    .allowed_origin("http://localhost:8000")
                    .resource("/update", |r| {
                        r.method(http::Method::PUT).with_async(update)
                    })
                    .resource("/login", |r| r.method(http::Method::POST).with_async(login))
                    .resource("/signup", |r| {
                        r.method(http::Method::POST).with_async(signup)
                    })
                    .resource("/subscribe", |r| {
                        r.method(http::Method::POST).with_async(subscribe)
                    })
                    .resource("/unsubscribe", |r| {
                        r.method(http::Method::DELETE).with_async(unsubscribe)
                    })
                    .register()
            })
        } else {
            app.resource("/update", |r| {
                r.method(http::Method::PUT).with_async(update)
            })
            .resource("/login", |r| r.method(http::Method::POST).with_async(login))
            .resource("/signup", |r| {
                r.method(http::Method::POST).with_async(signup)
            })
            .resource("/subscribe", |r| {
                r.method(http::Method::POST).with_async(subscribe)
            })
            .resource("/unsubscribe", |r| {
                r.method(http::Method::POST).with_async(unsubscribe)
            })
        }
    });
    server = if let Some(l) = listenfd.take_tcp_listener(0).unwrap() {
        server.listen(l)
    } else {
        server.bind("0.0.0.0:3000").unwrap()
    };

    server.start();

    println!("Started server");

    let _ = sys.run();
}
