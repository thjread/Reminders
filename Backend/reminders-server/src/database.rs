use diesel::prelude::*;
use diesel::result::Error;
use diesel::pg::PgConnection;
use diesel::r2d2::{ConnectionManager, Pool};
use uuid::Uuid;
use actix::prelude::*;
use serde_derive::{Serialize, Deserialize};
use dotenv::dotenv;
use std::env;
use chrono::prelude::*;

use crate::schema;
use crate::schema::todos::dsl as todo_dsl;
use crate::schema::users::dsl as users_dsl;
use crate::models::*;
use crate::auth;

pub struct DbExecutor(pub Pool<ConnectionManager<PgConnection>>);

impl Actor for DbExecutor {
    type Context = SyncContext<Self>;
}

pub fn establish_connection() -> r2d2::Pool<ConnectionManager<PgConnection>> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    r2d2::Pool::builder().build(manager).expect("Failed to create pool.")
}

fn get_todos(connection: &PgConnection) -> Result<Vec<Todo>, Error> {
    todo_dsl::todos.load::<Todo>(connection)//TODO limit total number?
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
        let conn = self.0.get().unwrap();

        for action in actions {
            let result = match action {
                UpdateAction::TOGGLE_DONE { id, done, .. } => {
                    diesel::update(todo_dsl::todos.find(id))
                        .set(todo_dsl::done.eq(done))
                        .get_result::<Todo>(&conn)
                }
            };
            if let Err(e) = result {
                println!("Database error: {}", e);
            }
        }
        return get_todos(&conn);
    }
}

pub struct AskForTodos();

impl Message for AskForTodos {
    type Result = Result<Vec<Todo>, Error>;
}

impl Handler<AskForTodos> for DbExecutor {
    type Result = Result<Vec<Todo>, Error>;

    fn handle(&mut self, _msg: AskForTodos, _: &mut Self::Context) -> Self::Result {
        let conn = self.0.get().unwrap();
        return get_todos(&conn);
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginDetails {
    username: String,
    password: String
}

pub struct Login(pub LoginDetails);

impl Message for Login {
    type Result = Result<(), Error>;
}

impl Handler<Login> for DbExecutor {
    type Result = Result<(), Error>;

    fn handle(&mut self, Login(details): Login, _: &mut Self::Context) -> Self::Result {
        println!("{} log in request", details.username);
        let conn = self.0.get().unwrap();
        return Ok(());
    }
}

pub struct Signup(pub LoginDetails);

#[derive(Debug, Serialize, Deserialize)]
pub enum SignupResult {
    UsernameTaken,
    Success{userid: Uuid},
}

impl Message for Signup {
    type Result = Result<SignupResult, Error>;
}

impl Handler<Signup> for DbExecutor {
    type Result = Result<SignupResult, Error>;

    fn handle(&mut self, Signup(details): Signup, _: &mut Self::Context) -> Self::Result {
        use diesel::select;
        use diesel::expression::dsl::exists;

        // TODO max username length

        println!("{} sign up request", &details.username);
        let conn = self.0.get().unwrap();
        let username_exists = select(exists(users_dsl::users.filter(users_dsl::username.eq(&details.username))))
            .get_result::<bool>(&conn)?;
        if username_exists {
            println!("Username {} already taken", &details.username);
            Ok(SignupResult::UsernameTaken)
        } else {
            let id = Uuid::new_v4();
            let hash = auth::hash_password(details.password);
            let new_user = User {
                userid: id,
                username: details.username,
                salt: hash.salt,
                hash: hash.hash,
                signup: Utc::now().naive_utc(),
            };
            diesel::insert_into(schema::users::table)
                .values(&new_user)
                .execute(&conn)?;
            Ok(SignupResult::Success {
                userid: id
            })
        }
    }
}
