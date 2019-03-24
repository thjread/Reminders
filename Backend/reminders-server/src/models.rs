use uuid::Uuid;
use chrono::NaiveDateTime;
use serde_derive::{Serialize, Deserialize};
use bigdecimal::BigDecimal;

use super::schema::todos;
use super::schema::users;
use super::schema::subscriptions;

#[derive(Debug, Serialize, Insertable, Deserialize, Queryable)]
#[table_name="todos"]
pub struct Todo {
    pub id: Uuid,
    pub userid: Uuid,
    pub title: String,
    pub deadline: Option<NaiveDateTime>,
    pub done: bool,
    pub done_time: Option<NaiveDateTime>,
    pub create_time: NaiveDateTime,
    pub hide_until_done: bool,
    pub highlight: bool,
}

#[derive(Debug, Insertable, Queryable)]
#[table_name="users"]
pub struct User {
    pub userid: Uuid,
    pub username: String,
    pub hash: String,
    pub signup: NaiveDateTime,
    pub todo_hash: BigDecimal,
}

#[derive(Debug, Serialize, Insertable, Deserialize, Queryable, AsChangeset)]
#[table_name="subscriptions"]
pub struct Subscription {
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
    pub userid: Uuid,
}
