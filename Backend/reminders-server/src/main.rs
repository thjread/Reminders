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

mod auth;
mod database;
mod models;
mod schema;

use auth::{CheckHash, Hash, HashExecutor};
use database::{AskForTodos, DbExecutor, GetUser, Signup, UpdateBatch};

struct AppState {
    db: Addr<DbExecutor>,
    hash: Addr<HashExecutor>,
}

fn update(
    (req, data): (HttpRequest<AppState>, Json<UpdateBatch>),
) -> Box<Future<Item = HttpResponse, Error = Error>> {
    let actions = data.0;
    req.state()
        .db
        .send(actions)
        .from_err()
        .and_then(|res| match res {
            Ok(todo) => Ok(HttpResponse::Ok().json(todo)),
            Err(e) => {
                dbg!(e);
                Ok(HttpResponse::InternalServerError().into())
            }
        })
        .responder()
}

fn ask_for_todos(req: &HttpRequest<AppState>) -> Box<Future<Item = HttpResponse, Error = Error>> {
    req.state()
        .db
        .send(AskForTodos())
        .from_err()
        .and_then(|res| match res {
            Ok(todo) => Ok(HttpResponse::Ok().json(todo)),
            Err(e) => {
                dbg!(e);
                Ok(HttpResponse::InternalServerError().into())
            }
        })
        .responder()
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
    Success { jwt: String },
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
                                    let jwt = auth::gen_jwt(user.userid);
                                    Ok(HttpResponse::Ok().json(LoginResult::Success { jwt: jwt }))
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
    Success { jwt: String },
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
                                            Ok(()) => {
                                                let jwt = auth::gen_jwt(userid);
                                                Ok(HttpResponse::Ok()
                                                    .json(SignupResult::Success { jwt: jwt }))
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

fn main() {
    std::env::set_var("RUST_LOG", "actix_web=INFO");
    env_logger::init();

    let mut listenfd = ListenFd::from_env();
    let sys = actix::System::new("reminders-server");

    let pool = database::establish_connection();
    let db_addr = SyncArbiter::start(2, move || DbExecutor(pool.clone()));
    let hash_addr = HashExecutor().start();

    let mut server = server::new(move || {
        App::with_state(AppState {
            db: db_addr.clone(),
            hash: hash_addr.clone(),
        })
        .prefix("/api")
        .middleware(Logger::new("%r %b %D"))
        .configure(|app| {
            Cors::for_app(app)
                .allowed_origin("http://localhost:8000")
                .resource("/update", |r| {
                    r.method(http::Method::PUT).with_async(update)
                })
                .resource("/todos", |r| r.method(http::Method::GET).a(ask_for_todos))
                .resource("/login", |r| r.method(http::Method::POST).with_async(login))
                .resource("/signup", |r| {
                    r.method(http::Method::POST).with_async(signup)
                })
                .register()
        })
    });
    server = if let Some(l) = listenfd.take_tcp_listener(0).unwrap() {
        server.listen(l)
    } else {
        server.bind("127.0.0.1:3000").unwrap()
    };

    server.run();

    let _ = sys.run();
}
