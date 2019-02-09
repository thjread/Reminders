import { ActionType, getType } from "typesafe-actions";

import { State, initState, Todo } from "./store";
import * as actions from "./actions";
export type Action = ActionType<typeof actions>;

export default (state: State, action: Action) => {
    switch (action.type) {
        case getType(actions.setModal):
            return state.set("modal", action.payload.modal);
        case getType(actions.setLoginDetails):
            return state.set("loginDetails", action.payload);
        case getType(actions.logoutResetStore):
            return initState;
        case getType(actions.createTodo): {
            const id = action.payload.id;
            const title = action.payload.title;
            const done = action.payload.done;
            const deadline = action.payload.deadline;
            let new_todo: Todo = {
                title: title,
                done: done,
            };
            if (deadline) {
                new_todo.deadline = deadline;
            }
            return state.set("todos", state.todos.merge({
                [id]: new_todo
            }))
        }
        case getType(actions.editTodo): {
            const id = action.payload.id;
            const title = action.payload.title;
            const done = action.payload.done;
            const deadline = action.payload.deadline;
            let new_todo: Todo = {
                title: title,
                done: done,
            };
            if (deadline) {
                new_todo.deadline = deadline;
            }
            return state.set("todos", state.todos.merge({
                [id]: new_todo
            }))
        }
        case getType(actions.toggleDone): {
            const id = action.payload.id;
            const done = action.payload.done;
            return state.setIn(["todos", id, "done"], done);
        }
        case getType(actions.deleteTodo): {
            const id = action.payload.id;
            return state.set("todos", state.todos.without(id));
        }
        case getType(actions.syncAction):
            const sync_action = action.payload.action;
            return state.set("syncActions", state.syncActions.concat([sync_action]));
        case getType(actions.syncActionSynced):
            const action_id = action.payload.action_id;
            return state.set("syncActions",
                             state.syncActions.filter(
                                 a => a.payload.action_id !== action_id
                             ));
        case getType(actions.setServerTodos):
            const todos = action.payload.todos;
            return state.set("todos", todos);
        default:
            return state;
    }
}
