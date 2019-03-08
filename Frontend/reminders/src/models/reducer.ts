import { ActionType, getType } from "typesafe-actions";
import { hash } from "./serialize";

import { State, initState, Todo, ActionDummy, getTodo } from "./store";
import * as actions from "./actions";
export type Action = ActionType<typeof actions>;

export default (state: State, action: Action) => {
    switch (action.type) {
        case getType(actions.setModal):
            return state.set("modal", action.payload.modal);
        case getType(actions.logoutResetStore):
            return initState;
        case getType(actions.createTodo): {
            const id = action.payload.id;
            const title = action.payload.title;
            const done = action.payload.done;
            const deadline = action.payload.deadline;
            const done_time = action.payload.done_time;
            const create_time = action.payload.create_time;
            const hide_until_done = action.payload.hide_until_done;
            let new_todo: Todo = {
                title: title,
                done: done,
                create_time: create_time,
                hide_until_done
            };
            if (deadline) {
                new_todo.deadline = deadline;
            }
            if (done_time) {
                new_todo.done_time = done_time;
            }
            let s = state.set("todos", state.todos.merge({
                [id]: new_todo
            }))
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.editTodo): {
            const id = action.payload.id;
            const title = action.payload.title;
            const deadline = action.payload.deadline;
            const old_todo = state.todos[id];
            const hide_until_done = action.payload.hide_until_done;
            let new_todo: Todo = {
                title: title,
                done: old_todo.done,
                create_time: new Date(old_todo.create_time.getTime()),
                hide_until_done
            };
            if (deadline) {
                new_todo.deadline = deadline;
            }
            if (old_todo.done_time) {
                new_todo.done_time = new Date(old_todo.done_time.getTime());
            }
            let s = state.set("todos", state.todos.merge({
                [id]: new_todo
            }))
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.toggleDone): {
            const id = action.payload.id;
            const done = action.payload.done;
            const done_time = action.payload.done_time;
            let s = state.setIn(["todos", id, "done"], done)
                .setIn(["todos", id, "done_time"], done_time);
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.deleteTodo): {
            const id = action.payload.id;
            let s = state.set("todos", state.todos.without(id));
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.syncAction):
            const sync_action = action.payload.action;
            return state.set("syncActions", state.syncActions.concat(sync_action as ActionDummy));
        case getType(actions.setUndoAction):
            const undo_info = action.payload.info;
            return state.set("undoAction", undo_info);
        case getType(actions.syncActionSynced):
            const action_id = action.payload.action_id;
            return state.set("syncActions",
                             state.syncActions.filter(
                                 a => a.payload.action_id !== action_id
                             ));
        case getType(actions.setState):
            return action.payload.state;
        case getType(actions.setServerTodos): {
            const todos = action.payload.todos;
            const hash = action.payload.hash;
            let s = state.set("todos", todos);
            return s.set("hash", hash);
        }
        case getType(actions.setMessage):
            const message = action.payload.message;
            return state.set("message", message);
        case getType(actions.setOnlineAsOf):
            const time = action.payload.time;
            return state.set("onlineAsOf", time);
        case getType(actions.addShortcut): {
            const code = action.payload.code;
            const shortcut = action.payload.shortcut;
            return state.set("shortcuts", state.shortcuts.merge({
                [code]: shortcut
            }));
        }
        case getType(actions.removeShortcut): {
            const code = action.payload.code;
            return state.set("shortcuts", state.shortcuts.without(code));
        }
        default:
            return state;
    }
}
