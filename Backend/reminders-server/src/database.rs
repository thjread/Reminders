use actix::prelude::*;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;
use serde_derive::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;
use failure::Error;

use crate::models::*;
use crate::schema;
use crate::schema::subscriptions::dsl as subscriptions_dsl;
use crate::schema::todos::dsl as todo_dsl;
use crate::schema::users::dsl as users_dsl;

pub struct DbExecutor(pub Pool<ConnectionManager<PgConnection>>);

impl Actor for DbExecutor {
    type Context = SyncContext<Self>;
}

pub fn establish_connection() -> r2d2::Pool<ConnectionManager<PgConnection>> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool.")
}

// TODO don't send completed todos?
fn get_todos(connection: &PgConnection, userid: Uuid) -> Result<Vec<Todo>, Error> {
    todo_dsl::todos
        .filter(todo_dsl::userid.eq(userid))
        .load::<Todo>(connection)
        .map_err(|e| e.into())//TODO limit total number?
}

fn toggle_done(
    connection: &PgConnection,
    userid: Uuid,
    id: Uuid,
    done: bool,
) -> Result<usize, Error> {
    diesel::update(todo_dsl::todos.filter(todo_dsl::userid.eq(userid)).find(id))
        .set(todo_dsl::done.eq(done))
        .execute(connection)
        .map_err(|e| e.into())
}

fn delete(connection: &PgConnection, userid: Uuid, id: Uuid) -> Result<usize, Error> {
    diesel::delete(todo_dsl::todos.filter(todo_dsl::userid.eq(userid)).find(id)).execute(connection)
        .map_err(|e| e.into())
}

fn create_todo(connection: &PgConnection, todo: Todo) -> Result<usize, Error> {
    // Note userid in Todo is set on server, so this is always safe
    diesel::insert_into(schema::todos::table)
        .values(&todo)
        .execute(connection)
        .map_err(|e| e.into())
}

fn edit_todo(
    connection: &PgConnection,
    userid: Uuid,
    id: Uuid,
    title: String,
    deadline: Option<chrono::NaiveDateTime>,
) -> Result<usize, Error> {
    diesel::update(todo_dsl::todos.filter(todo_dsl::userid.eq(userid)).find(id))
        .set((todo_dsl::title.eq(title), todo_dsl::deadline.eq(deadline)))
        .execute(connection)
        .map_err(|e| e.into())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
#[allow(non_camel_case_types)]
pub enum UpdateAction {
    TOGGLE_DONE {
        id: Uuid,
        done: bool,
        action_id: Uuid,
    },
    CREATE_TODO {
        id: Uuid,
        title: String,
        deadline: Option<chrono::DateTime<chrono::Utc>>,
        done: bool,
        action_id: Uuid,
    },
    EDIT_TODO {
        id: Uuid,
        title: String,
        deadline: Option<chrono::DateTime<chrono::Utc>>,
        action_id: Uuid,
    },
    DELETE_TODO {
        id: Uuid,
        action_id: Uuid,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBatch(pub Uuid, pub Vec<UpdateAction>);

impl Message for UpdateBatch {
    type Result = Result<Vec<Todo>, Error>;
}

impl Handler<UpdateBatch> for DbExecutor {
    type Result = Result<Vec<Todo>, Error>;

    fn handle(
        &mut self,
        UpdateBatch(userid, actions): UpdateBatch,
        _: &mut Self::Context,
    ) -> Self::Result {
        let conn = self.0.get()?;

        for action in actions {
            let result = match action {
                UpdateAction::CREATE_TODO {
                    id,
                    title,
                    deadline,
                    done,
                    ..
                } => {
                    let todo = Todo {
                        id: id,
                        userid: userid,
                        title: title,
                        deadline: deadline.map(|date| date.naive_utc()),
                        done: done,
                    };
                    create_todo(&conn, todo)
                }
                UpdateAction::EDIT_TODO {
                    id,
                    title,
                    deadline,
                    ..
                } => edit_todo(
                    &conn,
                    userid,
                    id,
                    title,
                    deadline.map(|date| date.naive_utc()),
                ),
                UpdateAction::TOGGLE_DONE { id, done, .. } => toggle_done(&conn, userid, id, done),
                UpdateAction::DELETE_TODO { id, .. } => delete(&conn, userid, id),
            };
            if let Err(e) = result {
                println!("Database error: {}", e);
            }
        }
        return get_todos(&conn, userid);
    }
}

pub struct GetUser(pub String);

impl Message for GetUser {
    type Result = Result<Option<User>, Error>;
}

impl Handler<GetUser> for DbExecutor {
    type Result = Result<Option<User>, Error>;

    fn handle(&mut self, GetUser(username): GetUser, _: &mut Self::Context) -> Self::Result {
        println!("{} login request", &username);
        let conn = self.0.get()?;
        Ok(users_dsl::users
            .filter(users_dsl::username.eq(&username))
            .first::<User>(&conn)
            .optional()?)
    }
}

pub struct Signup(pub User);

impl Message for Signup {
    type Result = Result<(), Error>;
}

impl Handler<Signup> for DbExecutor {
    type Result = Result<(), Error>;

    fn handle(&mut self, Signup(user): Signup, _: &mut Self::Context) -> Self::Result {
        let conn = self.0.get()?;
        diesel::insert_into(schema::users::table)
            .values(&user)
            .execute(&conn)?;
        Ok(())
    }
}

pub struct Subscribe(pub Subscription);

impl Message for Subscribe {
    type Result = Result<(), Error>;
}

impl Handler<Subscribe> for DbExecutor {
    type Result = Result<(), Error>;

    fn handle(&mut self, Subscribe(sub): Subscribe, _: &mut Self::Context) -> Self::Result {
        let conn = self.0.get()?;
        diesel::insert_into(schema::subscriptions::table)
            .values(&sub)
            .on_conflict(subscriptions_dsl::endpoint)
            .do_update()
            .set(&sub)
            .execute(&conn)?;
        // only allow notifications from one account per device
        // note attacker who obtained user's subscription endpoint could overwrite the subscription
        // but can't get alerts for any account other than their own
        Ok(())
    }
}

pub struct Unsubscribe {
    pub userid: Uuid,
    pub endpoint: String,
}

impl Message for Unsubscribe {
    type Result = Result<(), Error>;
}

impl Handler<Unsubscribe> for DbExecutor {
    type Result = Result<(), Error>;

    fn handle(&mut self, unsub: Unsubscribe, _: &mut Self::Context) -> Self::Result {
        let conn = self.0.get()?;
        diesel::delete(
            subscriptions_dsl::subscriptions
                .filter(subscriptions_dsl::userid.eq(unsub.userid))
                .find(unsub.endpoint),
        )
        .execute(&conn)?;
        Ok(())
    }
}
