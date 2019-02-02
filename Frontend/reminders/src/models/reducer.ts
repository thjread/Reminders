import { combineReducers } from "redux";
import { ActionType, getType } from "typesafe-actions";
import Immutable from "seamless-immutable";

import { State } from "./store";
import * as actions from "./actions";
export type Action = ActionType<typeof actions>;

export default (state: State, action: Action) => {
    switch (action.type) {
        case getType(actions.toggleDone):
            const id = action.payload.id;
            const done = action.payload.done;
            return state.setIn(["todos", id, "done"], done);
        case getType(actions.offlineAction):
            const offline_action = action.payload.action;
            return state.set("offlineActions", state.offlineActions.concat([offline_action]));
        case getType(actions.offlineActionCompleted):
            const action_id = action.payload.action_id;
            return state.set("offlineActions",
                             state.offlineActions.filter(
                                 a => a.payload.action_id !== action_id
                             ));
        case getType(actions.setServerTodos):
            const todos = action.payload.todos;
            return state.set("todos", todos);
        default:
            return state;
    }
}
