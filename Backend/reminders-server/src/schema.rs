table! {
    todos (id) {
        id -> Uuid,
        title -> Varchar,
        deadline -> Nullable<Timestamp>,
        done -> Bool,
    }
}

table! {
    users (userid) {
        userid -> Uuid,
        username -> Varchar,
        hash -> Bpchar,
        signup -> Timestamp,
    }
}

allow_tables_to_appear_in_same_query!(
    todos,
    users,
);
