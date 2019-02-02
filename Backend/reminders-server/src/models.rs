use uuid::Uuid;
use chrono::NaiveDateTime;
use serde_derive::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Queryable)]
pub struct Todo {
    pub id: Uuid,
    pub title: String,
    pub deadline: Option<NaiveDateTime>,
    pub done: bool,
}
