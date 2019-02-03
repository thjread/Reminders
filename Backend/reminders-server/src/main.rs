extern crate actix;
extern crate actix_web;
extern crate listenfd;
extern crate env_logger;
#[macro_use] extern crate diesel;
extern crate uuid;
extern crate chrono;
extern crate serde_derive;
extern crate dotenv;
extern crate futures;

use listenfd::ListenFd;
use actix_web::{server, http, App, Json, Error, HttpResponse, HttpRequest,
                AsyncResponder, middleware::cors::Cors, middleware::Logger};
use actix::prelude::*;
use futures::Future;

mod schema;
mod models;
mod database;

use database::{DbExecutor, UpdateBatch, AskForTodos};

struct AppState {
    db: Addr<DbExecutor>,
}

fn update((req, data): (HttpRequest<AppState>, Json<UpdateBatch>)) -> Box<Future<Item=HttpResponse, Error=Error>> {
    let actions = data.0;
    req.state().db.send(actions)
        .from_err()
        .and_then(|res| {
            match res {
                Ok(todo) => Ok(HttpResponse::Ok().json(todo)),
                Err(e) => { dbg!(e); Ok(HttpResponse::InternalServerError().into()) }
            }
        })
        .responder()
}

fn ask_for_todos(req: &HttpRequest<AppState>) -> Box<Future<Item=HttpResponse, Error=Error>> {
    req.state().db.send(AskForTodos())
        .from_err()
        .and_then(|res| {
            match res {
                Ok(todo) => Ok(HttpResponse::Ok().json(todo)),
                Err(e) => { dbg!(e); Ok(HttpResponse::InternalServerError().into()) }
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
    let addr = SyncArbiter::start(2, move || {
        DbExecutor(pool.clone())
    });

    let mut server = server::new(
        move || {
            App::with_state(AppState {db: addr.clone()})
                .prefix("/api")
                .middleware(Logger::new("%r %b %D"))
                .configure(|app| {
                    Cors::for_app(app)
                        .allowed_origin("http://localhost:8000")
                        .resource("/update",
                                  |r| r.method(http::Method::PUT).with_async(update))
                        .resource("/todos",
                                  |r| r.method(http::Method::GET).a(ask_for_todos))
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
