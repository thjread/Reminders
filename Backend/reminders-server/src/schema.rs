diesel::table! {
    subscriptions (endpoint) {
        endpoint -> Varchar,
        p256dh -> Varchar,
        auth -> Varchar,
        userid -> Uuid,
    }
}

diesel::table! {
    push_state (onerow) {
        onerow -> Bool,
        last_notify -> Timestamp,
    }
}

diesel::table! {
    todos (id) {
        id -> Uuid,
        userid -> Uuid,
        title -> Varchar,
        deadline -> Nullable<Timestamp>,
        done -> Bool,
        done_time -> Nullable<Timestamp>,
        create_time -> Timestamp,
        hide_until_done -> Bool,
        highlight -> Bool,
    }
}

diesel::table! {
    users (userid) {
        userid -> Uuid,
        username -> Varchar,
        hash -> Bpchar,
        signup -> Timestamp,
        todo_hash -> Numeric,
    }
}

diesel::joinable!(subscriptions -> users (userid));
diesel::joinable!(todos -> users (userid));

diesel::allow_tables_to_appear_in_same_query!(subscriptions, todos, users,);
