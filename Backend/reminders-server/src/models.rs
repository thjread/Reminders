use uuid::Uuid;
use chrono::NaiveDateTime;
use serde_derive::{Serialize, Deserialize};

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
}

#[derive(Debug, Serialize, Insertable, Deserialize, Queryable)]
#[table_name="users"]
pub struct User {
    pub userid: Uuid,
    pub username: String,
    pub hash: String,
    pub signup: NaiveDateTime,
}

#[derive(Debug, Serialize, Insertable, Deserialize, Queryable, AsChangeset)]
#[table_name="subscriptions"]
pub struct Subscription {
    pub userid: Uuid,
    pub endpoint: String,
    pub auth: String,
    pub p256dh: String,
}
