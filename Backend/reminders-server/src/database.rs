use diesel::prelude::*;
use diesel::result::Error;
use diesel::pg::PgConnection;
use uuid::Uuid;
use actix::prelude::*;
use serde_derive::{Serialize, Deserialize};
use dotenv::dotenv;
use std::env;

use crate::schema;
use crate::models;

pub struct DbExecutor(pub PgConnection);

impl Actor for DbExecutor {
    type Context = SyncContext<Self>;
}

pub fn establish_connection() -> PgConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToggleDone {
    id: Uuid,
    done: bool,
}

impl Message for ToggleDone {
    type Result = Result<models::Todo, Error>;
}

impl Handler<ToggleDone> for DbExecutor {
    type Result = Result<models::Todo, Error>;

    fn handle(&mut self, msg: ToggleDone, _: &mut Self::Context) -> Self::Result {
        use self::schema::todos::dsl::*;

        let todo = diesel::update(todos.find(msg.id))
            .set(done.eq(msg.done))
            .get_result::<models::Todo>(&self.0)?;

        return Ok(todo);
    }
}
