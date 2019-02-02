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
        default:
            return state;
    }
}
