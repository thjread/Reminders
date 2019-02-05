use uuid::Uuid;
use chrono::NaiveDateTime;
use serde_derive::{Serialize, Deserialize};

use super::schema::todos;
use super::schema::users;

#[derive(Serialize, Insertable, Deserialize, Queryable)]
#[table_name="todos"]
pub struct Todo {
    pub id: Uuid,
    pub title: String,
    pub deadline: Option<NaiveDateTime>,
    pub done: bool,
}

#[derive(Serialize, Insertable, Deserialize, Queryable)]
#[table_name="users"]
pub struct User {
    pub userid: Uuid,
    pub username: String,
    pub salt: String,
    pub hash: String,
    pub signup: NaiveDateTime,
}
