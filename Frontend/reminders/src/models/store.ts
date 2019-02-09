import { createStore } from "redux";
import Immutable from "seamless-immutable";
import { LoginDetails } from "./auth";
import reducer from "./reducer";

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

interface StateI {
    todos: TodoMap;
    currentDate: Date;
    syncActions: any[];
    loginDetails?: LoginDetails;
    modal: any;
}
export type State = Immutable.Immutable<StateI>;

function dateTimeReviver(_: any, value: any) {
    if (typeof value === 'string') {
        const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
        if (reISO.exec(value)) {
            return new Date(value);
        }
    }
    return value;
}

const s: StateI = {
    todos: {},
    currentDate: new Date("2019-01-29T13:00:00.000Z"),
    syncActions: [],
    modal: null,
}
export const initState: State = Immutable(s);

export function loadFromStorage() {
    let is = initState;
    const loginJSON = localStorage.getItem("loginDetails");
    if (loginJSON) {
        const loginDetails = JSON.parse(loginJSON);
        is = is.set("loginDetails", loginDetails);
        const stateJSON = localStorage.getItem(loginDetails.userid);
        if (stateJSON) {
            const state = JSON.parse(stateJSON, dateTimeReviver);
            is = is.set("todos", state.todos);
            is = is.set("syncActions", state.syncActions);
        }
    }
    return is;
}

export const store = createStore(reducer, loadFromStorage(), (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__());

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
