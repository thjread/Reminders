table! {
    subscriptions (endpoint) {
        endpoint -> Varchar,
        p256dh -> Varchar,
        auth -> Varchar,
        userid -> Uuid,
    }
}

table! {
    todos (id) {
        id -> Uuid,
        userid -> Uuid,
        title -> Varchar,
        deadline -> Nullable<Timestamp>,
        done -> Bool,
        done_time -> Nullable<Timestamp>,
        create_time -> Timestamp,
        hide_until_done -> Bool,
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

joinable!(subscriptions -> users (userid));
joinable!(todos -> users (userid));

allow_tables_to_appear_in_same_query!(
    subscriptions,
    todos,
    users,
);
