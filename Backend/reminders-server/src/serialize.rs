use std::fmt;
use twox_hash::XxHash32;
use std::hash::Hasher;

use crate::models::*;

#[derive(Debug)]
pub struct Hash(pub u64);

struct Fmt<F>(pub F) where F: Fn(&mut fmt::Formatter) -> fmt::Result;

impl<F> fmt::Display for Fmt<F>
where F: Fn(&mut fmt::Formatter) -> fmt::Result
{
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        (self.0)(f)
    }
}

fn serialize_todo(t: &Todo, f: &mut fmt::Formatter) -> fmt::Result {
    write!(f, "[id]:{},\n[title]:\"{}\",\n[deadline]:{:?},\n[done]:{},\n[done_time]:{:?},\n[create_time]:{:?},\n[hide_until_done]:{}\n", t.id, t.title, t.deadline.map(|d| d.timestamp()), t.done, t.done_time.map(|d| d.timestamp()), t.create_time.timestamp(), t.hide_until_done)// escape newlines in title?
}

fn serialize_todos(todos: &[Todo], f: &mut fmt::Formatter) -> fmt::Result {
    for t in todos {
        writeln!(f, "[")?;
        serialize_todo(t, f)?;
        writeln!(f, "]")?;
    }
    write!(f, "")
}

fn serialize(todos: &[Todo]) -> String {
    format!("{}", Fmt(|f| serialize_todos(todos, f)))
}

// Todos must be sorted by id
pub fn hash(todos: &[Todo]) -> Hash {
    let s = serialize(todos);
    let mut h = XxHash32::with_seed(42);
    h.write(s.as_bytes());
    Hash(h.finish())
}
