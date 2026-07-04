use bigdecimal::BigDecimal;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::schema::subscriptions;
use super::schema::todos;
use super::schema::users;

#[derive(Debug, Serialize, Insertable, Deserialize, Queryable)]
#[diesel(table_name = todos)]
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
#[diesel(table_name = users)]
pub struct User {
    pub userid: Uuid,
    pub username: String,
    pub hash: String,
    pub signup: NaiveDateTime,
    pub todo_hash: BigDecimal,
}

#[derive(Debug, Serialize, Insertable, Deserialize, Queryable, AsChangeset)]
#[diesel(table_name = subscriptions)]
pub struct Subscription {
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
    pub userid: Uuid,
}
