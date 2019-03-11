import { ActionType, getType } from "typesafe-actions";
import { hash } from "./serialize";

import { State, initState, Todo, ActionDummy } from "./store";
import * as actions from "./actions";
export type Action = ActionType<typeof actions>;
import Immutable from "seamless-immutable";

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
            const new_todo: Todo = {
                title,
                done,
                create_time,
                hide_until_done,
            };
            if (deadline) {
                new_todo.deadline = deadline;
            }
            if (done_time) {
                new_todo.done_time = done_time;
            }
            const s = state.set("todos", state.todos.merge({
                [id]: new_todo,
            }));
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.editTodo): {
            const id = action.payload.id;
            const title = action.payload.title;
            const deadline = action.payload.deadline;
            const old_todo = state.todos[id];
            const hide_until_done = action.payload.hide_until_done;
            const new_todo: Todo = {
                title,
                done: old_todo.done,
                create_time: new Date(old_todo.create_time.getTime()),
                hide_until_done,
            };
            if (deadline) {
                new_todo.deadline = deadline;
            }
            if (old_todo.done_time) {
                new_todo.done_time = new Date(old_todo.done_time.getTime());
            }
            const s = state.set("todos", state.todos.merge({
                [id]: new_todo,
            }));
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.toggleDone): {
            const id = action.payload.id;
            const done = action.payload.done;
            const done_time = action.payload.done_time;
            const s = state.setIn(["todos", id, "done"], done)
                .setIn(["todos", id, "done_time"], done_time);
            return s.set("hash", hash(s.todos.asMutable()));
        }
        case getType(actions.deleteTodo): {
            const id = action.payload.id;
            const s = state.set("todos", state.todos.without(id));
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
                                 (a) => a.payload.action_id !== action_id,
                             ));
        case getType(actions.setState):
            return action.payload.state;
        case getType(actions.setServerTodos): {
            const todos = action.payload.todos;
            const serverHash = action.payload.hash;
            const s = state.set("todos", todos);
            return s.set("hash", serverHash);
        }
        case getType(actions.setMessage):
            const message = action.payload.message;
            return state.set("message", message);
        case getType(actions.setOnlineAsOf):
            const time = action.payload.time;
            return state.set("onlineAsOf", time);
        case getType(actions.createShortcutContext): {
            return state.set("shortcutStack", Immutable([{ }]).concat(state.shortcutStack));
        }
        case getType(actions.popShortcutContext): {
            return state.set("shortcutStack", state.shortcutStack.slice(1, state.shortcutStack.length));
        }
        case getType(actions.addShortcut): {
            const code = action.payload.code;
            const shortcut = action.payload.shortcut;
            if (state.shortcutStack.length > 0) {
                const shortcuts = Immutable(state.shortcutStack[0]);
                return state.setIn(["shortcutStack", 0], shortcuts.merge({
                    [code]: shortcut,
                }));
            }
        }
        case getType(actions.removeShortcut): {
            const code = action.payload.code;
            const shortcuts = Immutable(state.shortcutStack[0]);
            return state.setIn(["shortcutStack", 0], shortcuts.without(code));
        }
        default:
            return state;
    }
};
