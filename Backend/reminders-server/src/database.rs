use diesel::prelude::*;
use diesel::result::Error;
use diesel::pg::PgConnection;
use uuid::Uuid;
use actix::prelude::*;
use serde_derive::{Serialize, Deserialize};
use dotenv::dotenv;
use std::env;

use crate::schema::todos::dsl;
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
    dsl::todos.load::<Todo>(connection)//TODO limit total number?
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content="payload")]
#[allow(non_camel_case_types)]
pub enum UpdateAction {
    TOGGLE_DONE {
        id: Uuid,
        done: bool,
        action_id: Uuid,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBatch(Vec<UpdateAction>);

impl Message for UpdateBatch {
    type Result = Result<Vec<Todo>, Error>;
}

impl Handler<UpdateBatch> for DbExecutor {
    type Result = Result<Vec<Todo>, Error>;

    fn handle(&mut self, UpdateBatch(actions): UpdateBatch, _: &mut Self::Context) -> Self::Result {
        for action in actions {
            let result = match action {
                UpdateAction::TOGGLE_DONE { id, done, .. } => {
                    diesel::update(dsl::todos.find(id))
                        .set(dsl::done.eq(done))
                        .get_result::<Todo>(&self.0)
                }
            };
            if let Err(e) = result {
                println!("Database error: {}", e);
            }
        }
        return get_todos(&self.0);
    }
}

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
