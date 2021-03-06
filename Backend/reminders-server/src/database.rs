use crate::models::*;
use crate::schema;
use crate::schema::subscriptions::dsl as subscriptions_dsl;
use crate::schema::todos::dsl as todos_dsl;
use crate::schema::users::dsl as users_dsl;
use crate::serialize::hash;
use actix::prelude::*;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use failure::Error;
use serde_derive::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;
use bigdecimal::BigDecimal;
use bigdecimal::ToPrimitive;

pub struct DbExecutor(pub Pool<ConnectionManager<PgConnection>>);

impl Actor for DbExecutor {
    type Context = SyncContext<Self>;
}

pub fn establish_connection() -> r2d2::Pool<ConnectionManager<PgConnection>> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    r2d2::Pool::builder()
        .min_idle(Some(1))
        .build(manager)
        .expect("Failed to create pool.")
}

// TODO don't send completed todos?
fn get_todos(connection: &PgConnection, userid: Uuid) -> Result<Vec<Todo>, Error> {
    todos_dsl::todos
        .filter(todos_dsl::userid.eq(userid))
        .order(todos_dsl::id)// so that serialization is reproducible
        .load::<Todo>(connection)
        .map_err(|e| e.into())// TODO limit total number?
}

fn get_todo_hash(connection: &PgConnection, userid: Uuid) -> Result<u64, Error> {
    users_dsl::users.select(users_dsl::todo_hash)
        .find(userid)
        .get_result::<BigDecimal>(connection)
        .map_err(|e| e.into())
        .map(|d| d.to_u64())
        .transpose()
        .unwrap_or_else(|| Err(failure::err_msg("Failed to convert hash to u64")))
}

fn set_todo_hash(connection: &PgConnection, userid: Uuid, todo_hash: BigDecimal) -> Result<usize, Error> {
    diesel::update(
        users_dsl::users
            .find(userid),
    )
        .set(users_dsl::todo_hash.eq(todo_hash))
        .execute(connection)
        .map_err(|e| e.into())
}

fn toggle_done(
    connection: &PgConnection,
    userid: Uuid,
    id: Uuid,
    done: bool,
    done_time: Option<chrono::NaiveDateTime>,
) -> Result<usize, Error> {
    diesel::update(
        todos_dsl::todos
            .filter(todos_dsl::userid.eq(userid))
            .find(id),
    )
    .set((todos_dsl::done.eq(done), todos_dsl::done_time.eq(done_time)))
    .execute(connection)
    .map_err(|e| e.into())
}

fn toggle_highlight(
    connection: &PgConnection,
    userid: Uuid,
    id: Uuid,
    highlight: bool,
) -> Result<usize, Error> {
    diesel::update(
        todos_dsl::todos
            .filter(todos_dsl::userid.eq(userid))
            .find(id),
    )
        .set(todos_dsl::highlight.eq(highlight))
        .execute(connection)
        .map_err(|e| e.into())
}

fn delete(connection: &PgConnection, userid: Uuid, id: Uuid) -> Result<usize, Error> {
    diesel::delete(
        todos_dsl::todos
            .filter(todos_dsl::userid.eq(userid))
            .find(id),
    )
    .execute(connection)
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
    hide_until_done: bool,
) -> Result<usize, Error> {
    diesel::update(
        todos_dsl::todos
            .filter(todos_dsl::userid.eq(userid))
            .find(id),
    )
    .set((todos_dsl::title.eq(title), todos_dsl::deadline.eq(deadline), todos_dsl::hide_until_done.eq(hide_until_done)))
    .execute(connection)
    .map_err(|e| e.into())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "payload")]
#[allow(non_camel_case_types)]
pub enum UpdateAction {
    TOGGLE_DONE {
        id: Uuid,
        done: bool,
        done_time: Option<chrono::DateTime<chrono::Utc>>,
        action_id: Uuid,
    },
    TOGGLE_HIGHLIGHT {
        id: Uuid,
        highlight: bool,
        action_id: Uuid,
    },
    CREATE_TODO {
        id: Uuid,
        title: String,
        deadline: Option<chrono::DateTime<chrono::Utc>>,
        done: bool,
        done_time: Option<chrono::DateTime<chrono::Utc>>,
        create_time: chrono::DateTime<chrono::Utc>,
        hide_until_done: bool,
        highlight: bool,
        action_id: Uuid,
    },
    EDIT_TODO {
        id: Uuid,
        title: String,
        deadline: Option<chrono::DateTime<chrono::Utc>>,
        hide_until_done: bool,
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
    type Result = Result<u64, Error>;
}

impl Handler<UpdateBatch> for DbExecutor {
    type Result = Result<u64, Error>;

    fn handle(
        &mut self,
        UpdateBatch(userid, actions): UpdateBatch,
        _: &mut Self::Context,
    ) -> Self::Result {
        let conn = self.0.get()?;

        if !actions.is_empty() {
            for action in actions {
                let result = match action.clone() {
                    // note clone is only so we can print in error message
                    UpdateAction::CREATE_TODO {
                        id,
                        title,
                        deadline,
                        done,
                        done_time,
                        create_time,
                        hide_until_done,
                        highlight,
                        ..
                    } => {
                        let todo = Todo {
                            id,
                            userid,
                            title,
                            deadline: deadline.map(|date| date.naive_utc()),
                            done,
                            done_time: done_time.map(|date| date.naive_utc()),
                            create_time: create_time.naive_utc(),
                            hide_until_done,
                            highlight,
                        };
                        create_todo(&conn, todo)
                    }
                    UpdateAction::EDIT_TODO {
                        id,
                        title,
                        deadline,
                        hide_until_done,
                        ..
                    } => edit_todo(
                        &conn,
                        userid,
                        id,
                        title,
                        deadline.map(|date| date.naive_utc()),
                        hide_until_done,
                    ),
                    UpdateAction::TOGGLE_DONE {
                        id,
                        done,
                        done_time,
                        ..
                    } => toggle_done(
                        &conn,
                        userid,
                        id,
                        done,
                        done_time.map(|date| date.naive_utc()),
                    ),
                    UpdateAction::TOGGLE_HIGHLIGHT {
                        id,
                        highlight,
                        ..
                    } => toggle_highlight(
                        &conn,
                        userid,
                        id,
                        highlight,
                    ),
                    UpdateAction::DELETE_TODO { id, .. } => delete(&conn, userid, id),
                };
                if let Err(e) = result {
                    println!(
                        "[RUST] Database error while performing update {:?}: {}",
                        action, e
                    );
                }
            }
            let todos = get_todos(&conn, userid)?;
            let hash = hash(&todos);
            println!("[RUST] New hash {} for user {}", hash.0, userid);
            set_todo_hash(&conn, userid, BigDecimal::from(hash.0))?;
            Ok(hash.0)
        } else {
            get_todo_hash(&conn, userid)
        }
    }
}

pub struct GetTodos(pub Uuid);

impl Message for GetTodos {
    type Result = Result<Vec<Todo>, Error>;
}

impl Handler<GetTodos> for DbExecutor {
    type Result = Result<Vec<Todo>, Error>;

    fn handle(&mut self, GetTodos(userid): GetTodos, _: &mut Self::Context) -> Self::Result {
        let conn = self.0.get()?;
        get_todos(&conn, userid)
    }
}

pub struct GetUser(pub String);

impl Message for GetUser {
    type Result = Result<Option<User>, Error>;
}

impl Handler<GetUser> for DbExecutor {
    type Result = Result<Option<User>, Error>;

    fn handle(&mut self, GetUser(username): GetUser, _: &mut Self::Context) -> Self::Result {
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

pub struct GetNotifications {
    pub since: chrono::NaiveDateTime,
    pub until: chrono::NaiveDateTime,
}

impl Message for GetNotifications {
    type Result = Result<Vec<(Todo, Subscription)>, Error>;
}

impl Handler<GetNotifications> for DbExecutor {
    type Result = Result<Vec<(Todo, Subscription)>, Error>;

    fn handle(&mut self, notif: GetNotifications, _: &mut Self::Context) -> Self::Result {
        let conn = self.0.get()?;
        todos_dsl::todos
            .filter(
                todos_dsl::deadline
                    .between(notif.since, notif.until)
                    .and(todos_dsl::done.eq(false)),
            )
            .inner_join(
                subscriptions_dsl::subscriptions
                    .on(todos_dsl::userid.eq(subscriptions_dsl::userid)),
            )
            .load::<(Todo, Subscription)>(&conn)
            .map_err(|e| e.into())
    }
}
