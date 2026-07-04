use crate::models::*;
use crate::schema;
use crate::schema::subscriptions::dsl as subscriptions_dsl;
use crate::schema::todos::dsl as todos_dsl;
use crate::schema::users::dsl as users_dsl;
use crate::serialize::hash;
use anyhow::Error;
use bigdecimal::BigDecimal;
use bigdecimal::ToPrimitive;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

pub type DbPool = Pool<ConnectionManager<PgConnection>>;

pub fn establish_connection() -> DbPool {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    Pool::builder()
        .min_idle(Some(1))
        .build(manager)
        .expect("Failed to create pool.")
}

// TODO don't send completed todos?
fn todos_query(connection: &mut PgConnection, userid: Uuid) -> Result<Vec<Todo>, Error> {
    todos_dsl::todos
        .filter(todos_dsl::userid.eq(userid))
        .order(todos_dsl::id) // so that serialization is reproducible
        .load::<Todo>(connection)
        .map_err(|e| e.into()) // TODO limit total number?
}

fn get_todo_hash(connection: &mut PgConnection, userid: Uuid) -> Result<u64, Error> {
    users_dsl::users
        .select(users_dsl::todo_hash)
        .find(userid)
        .get_result::<BigDecimal>(connection)
        .map_err(Error::from)
        .map(|d| d.to_u64())
        .transpose()
        .unwrap_or_else(|| Err(anyhow::anyhow!("Failed to convert hash to u64")))
}

fn set_todo_hash(
    connection: &mut PgConnection,
    userid: Uuid,
    todo_hash: BigDecimal,
) -> Result<usize, Error> {
    diesel::update(users_dsl::users.find(userid))
        .set(users_dsl::todo_hash.eq(todo_hash))
        .execute(connection)
        .map_err(|e| e.into())
}

fn toggle_done(
    connection: &mut PgConnection,
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
    connection: &mut PgConnection,
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

fn delete(connection: &mut PgConnection, userid: Uuid, id: Uuid) -> Result<usize, Error> {
    diesel::delete(
        todos_dsl::todos
            .filter(todos_dsl::userid.eq(userid))
            .find(id),
    )
    .execute(connection)
    .map_err(|e| e.into())
}

fn create_todo(connection: &mut PgConnection, todo: Todo) -> Result<usize, Error> {
    // Note userid in Todo is set on server, so this is always safe
    diesel::insert_into(schema::todos::table)
        .values(&todo)
        .execute(connection)
        .map_err(|e| e.into())
}

fn edit_todo(
    connection: &mut PgConnection,
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
    .set((
        todos_dsl::title.eq(title),
        todos_dsl::deadline.eq(deadline),
        todos_dsl::hide_until_done.eq(hide_until_done),
    ))
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

pub fn update_batch(pool: &DbPool, userid: Uuid, actions: Vec<UpdateAction>) -> Result<u64, Error> {
    let conn = &mut pool.get()?;

    if !actions.is_empty() {
        conn.transaction(|conn| apply_batch(conn, userid, actions))
    } else {
        get_todo_hash(conn, userid)
    }
}

fn apply_batch(
    conn: &mut PgConnection,
    userid: Uuid,
    actions: Vec<UpdateAction>,
) -> Result<u64, Error> {
    {
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
                    create_todo(conn, todo)
                }
                UpdateAction::EDIT_TODO {
                    id,
                    title,
                    deadline,
                    hide_until_done,
                    ..
                } => edit_todo(
                    conn,
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
                } => toggle_done(conn, userid, id, done, done_time.map(|date| date.naive_utc())),
                UpdateAction::TOGGLE_HIGHLIGHT { id, highlight, .. } => {
                    toggle_highlight(conn, userid, id, highlight)
                }
                UpdateAction::DELETE_TODO { id, .. } => delete(conn, userid, id),
            };
            if let Err(e) = result {
                println!(
                    "[RUST] Database error while performing update {:?}: {}",
                    action, e
                );
            }
        }
        let todos = todos_query(conn, userid)?;
        let hash = hash(&todos);
        println!("[RUST] New hash {} for user {}", hash.0, userid);
        set_todo_hash(conn, userid, BigDecimal::from(hash.0))?;
        Ok(hash.0)
    }
}

pub fn get_todos(pool: &DbPool, userid: Uuid) -> Result<Vec<Todo>, Error> {
    let conn = &mut pool.get()?;
    todos_query(conn, userid)
}

pub fn get_user(pool: &DbPool, username: &str) -> Result<Option<User>, Error> {
    let conn = &mut pool.get()?;
    Ok(users_dsl::users
        .filter(users_dsl::username.eq(username))
        .first::<User>(conn)
        .optional()?)
}

pub fn signup(pool: &DbPool, user: User) -> Result<(), Error> {
    let conn = &mut pool.get()?;
    diesel::insert_into(schema::users::table)
        .values(&user)
        .execute(conn)?;
    Ok(())
}

pub fn subscribe(pool: &DbPool, sub: Subscription) -> Result<(), Error> {
    let conn = &mut pool.get()?;
    diesel::insert_into(schema::subscriptions::table)
        .values(&sub)
        .on_conflict(subscriptions_dsl::endpoint)
        .do_update()
        .set(&sub)
        .execute(conn)?;
    // only allow notifications from one account per device
    // note attacker who obtained user's subscription endpoint could overwrite the subscription
    // but can't get alerts for any account other than their own
    Ok(())
}

pub fn unsubscribe(pool: &DbPool, userid: Uuid, endpoint: String) -> Result<(), Error> {
    let conn = &mut pool.get()?;
    diesel::delete(
        subscriptions_dsl::subscriptions
            .filter(subscriptions_dsl::userid.eq(userid))
            .find(endpoint),
    )
    .execute(conn)?;
    Ok(())
}

pub fn get_last_notify(pool: &DbPool) -> Result<chrono::NaiveDateTime, Error> {
    let conn = &mut pool.get()?;
    schema::push_state::dsl::push_state
        .select(schema::push_state::dsl::last_notify)
        .first(conn)
        .map_err(|e| e.into())
}

/// Fetch the todos to notify for deadlines in (since, until] and advance the
/// persisted watermark to `until` in the same transaction, so a crash between
/// the two can't skip a window.
pub fn take_notifications(
    pool: &DbPool,
    since: chrono::NaiveDateTime,
    until: chrono::NaiveDateTime,
) -> Result<Vec<(Todo, Subscription)>, Error> {
    let conn = &mut pool.get()?;
    conn.transaction(|conn| {
        diesel::update(schema::push_state::dsl::push_state)
            .set(schema::push_state::dsl::last_notify.eq(until))
            .execute(conn)?;
        todos_dsl::todos
            .filter(
                todos_dsl::deadline
                    .between(since, until)
                    .and(todos_dsl::done.eq(false)),
            )
            .inner_join(
                subscriptions_dsl::subscriptions
                    .on(todos_dsl::userid.eq(subscriptions_dsl::userid)),
            )
            .load::<(Todo, Subscription)>(conn)
            .map_err(|e| e.into())
    })
}
