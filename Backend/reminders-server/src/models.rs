use uuid::Uuid;
use chrono::NaiveDate;
use serde_derive::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Queryable)]
pub struct Todo {
    pub id: Uuid,
    pub title: String,
    pub deadline: Option<NaiveDate>,
    pub done: bool,
}
