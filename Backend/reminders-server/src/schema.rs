table! {
    todos (id) {
        id -> Uuid,
        title -> Varchar,
        deadline -> Nullable<Timestamp>,
        done -> Bool,
    }
}
