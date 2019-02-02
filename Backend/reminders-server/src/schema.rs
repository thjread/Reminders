table! {
    todos (id) {
        id -> Uuid,
        title -> Varchar,
        deadline -> Nullable<Date>,
        done -> Bool,
    }
}
