import { createStore } from "redux";
import Immutable from "seamless-immutable";
import { LoginDetails } from "./auth";
import reducer from "./reducer";
import { setState } from "./actions";
import { stateFromStorage } from "./update";

export interface Todo {
    title: string,
    deadline?: Date,
    done: boolean
}
export type TodoMap = { [id: string]: Todo };

function itemCompare(a: string, b: string) {
    let compare = deadlineCompare(getTodo(a).deadline, getTodo(b).deadline);
    if (compare === 0) {
        if (a < b) {
            return -1;
        } else {
            return 1;
        }
    } else {
        return compare;
    }
}

function deadlineCompare(a: Date | undefined, b: Date | undefined) {
    if (a) {
        if (b) {
            if (a < b) {
                return -1;
            } else if (b < a) {
                return 1;
            } else {
                return 0;
            }
        } else {
            return -1;
        }
    } else {
        if (b) {
            return 1;
        } else {
            return 0;
        }
    }
}

export interface ActionDummy {
    type: string,
    payload: any
}


export interface UndoInfo {
    redoAction: () => ActionDummy;
    time: Date;
}

interface StateI {
    todos: TodoMap;
    currentDate: Date;
    syncActions: ActionDummy[];
    undoAction?: UndoInfo;
    loginDetails?: LoginDetails;
    modal: any;
}
export type State = Immutable.Immutable<StateI>;

const s: StateI = {
    todos: {},
    currentDate: new Date("2019-01-29T13:00:00.000Z"),
    syncActions: [],
    modal: null,
}
export const initState: State = Immutable(s);

export const store = createStore(reducer, initState, (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__());
store.dispatch(setState(stateFromStorage()));

export function getTodo(id: string) {
    return store.getState().todos[id].asMutable();
}

export function todoDue(id: string) {
    const deadline = getTodo(id).deadline;
    if (deadline) {
        return new Date() > deadline;
    } else {
        return true;
    }
}

export function dueTodos() {
    return Object.keys(store.getState().todos)
        .filter(todoDue)
        .filter((id) => !getTodo(id).done)
        .sort((a, b) => itemCompare(a, b));
}

export function laterTodos() {
    return Object.keys(store.getState().todos)
        .filter(id => !todoDue(id))
        .filter((id) => !getTodo(id).done)
        .sort((a, b) => itemCompare(a, b));
}

export function pendingUndo() {
    return store.getState().undoAction;
}
