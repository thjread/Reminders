import {xxHash32} from "js-xxhash";

import { Todo, TodoMap } from "./store";

function dateFormat(d: Date) {
    return Math.floor(d.getTime()/1000);
}

function serializeTodo(id: string, t: Todo) {
    let deadline = t.deadline ? `Some(${dateFormat(t.deadline)})` : "None";
    let done_time = t.done_time ? `Some(${dateFormat(t.done_time)})` : "None";
   return `[id]:${id},
[title]:"${t.title}",
[deadline]:${deadline},
[done]:${t.done},
[done_time]:${done_time},
[create_time]:${dateFormat(t.create_time)},
[hide_until_done]:${t.hide_until_done}
`;
}

export function serializeTodos(todos: TodoMap) {
    let result = "";
    Object.keys(todos).sort().forEach(key => {
        result += "[\n";
        result += serializeTodo(key, todos[key]);
        result += "]\n";
    })
    return result;
}

export function hash(todos: TodoMap) {
    let s = serializeTodos(todos);
    return xxHash32(Buffer.from(s, 'utf8'), 42);
}
