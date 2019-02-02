use diesel::prelude::*;
use diesel::result::Error;
use diesel::pg::PgConnection;
use uuid::Uuid;
use actix::prelude::*;
use serde_derive::{Serialize, Deserialize};
use dotenv::dotenv;
use std::env;

use crate::schema::todos::dsl::*;
use crate::models::*;

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

fn get_todos(connection: &PgConnection) -> Result<Vec<Todo>, Error> {
    todos.load::<Todo>(connection)//TODO limit total number?
}

/* TOGGLE DONE */

#[derive(Debug, Serialize, Deserialize)]
pub struct ToggleDone {
    id: Uuid,
    done: bool,
}

impl Message for ToggleDone {
    type Result = Result<Vec<Todo>, Error>;
}

impl Handler<ToggleDone> for DbExecutor {
    type Result = Result<Vec<Todo>, Error>;

    fn handle(&mut self, msg: ToggleDone, _: &mut Self::Context) -> Self::Result {
        diesel::update(todos.find(msg.id))
            .set(done.eq(msg.done))
            .get_result::<Todo>(&self.0)?;

        return get_todos(&self.0);
    }
}

/* ASK FOR TODOS */

#[derive(Debug, Serialize, Deserialize)]
pub struct AskForTodos();

impl Message for AskForTodos {
    type Result = Result<Vec<Todo>, Error>;
}

impl Handler<AskForTodos> for DbExecutor {
    type Result = Result<Vec<Todo>, Error>;

    fn handle(&mut self, _msg: AskForTodos, _: &mut Self::Context) -> Self::Result {
        return get_todos(&self.0);
    }
}
