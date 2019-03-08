import { createStore } from "redux";
import Immutable from "seamless-immutable";
import { LoginDetails } from "./auth";
import reducer from "./reducer";
import { setState } from "./actions";
import { stateFromStorage } from "./update";
import { hash } from "./serialize";

export interface Todo {
    title: string,
    deadline?: Date,
    done: boolean,
    done_time?: Date,
    create_time: Date
    hide_until_done: boolean,
}
export type TodoMap = { [id: string]: Todo };

function itemCompare(id_a: string, id_b: string) {
    const ta = getTodo(id_a);
    const tb = getTodo(id_b);
    let comp1 = dateCompare(ta.deadline, tb.deadline, true);
    if (comp1 === 0) {
        let comp2 = dateCompare(ta.create_time, tb.create_time, false);
        if (comp2 === 0) {
            if (id_a < id_b) {// stable tie break
                return -1;
            } else {
                return 1;
            }
        } else {
            return -comp2;// most recently created first
        }
    } else {
        return comp1;// oldest deadline first
    }
}

function completedCompare(id_a: string, id_b: string) {
    const ta = getTodo(id_a);
    const tb = getTodo(id_b);
    let comp1 = dateCompare(ta.done_time, tb.done_time, false);
    if (comp1 === 0) {
        if (id_a < id_b) {// stable tie break
            return -1;
        } else {
            return 1;
        }
    } else {
        return -comp1;// most recently completed first
    }
}

function dateCompare(a: Date | undefined, b: Date | undefined, undefined_lower: boolean) {
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
            return undefined_lower ? -1 : 1;
        }
    } else {
        if (b) {
            return undefined_lower ? 1 : -1;
        } else {
            return 0;
        }
    }
}

export interface ActionDummy {
    type: string;
    payload: any;
}


export interface UndoInfo {
    redoAction: () => ActionDummy;
    time: Date;
}

export interface Message {
    text: string;
    time: Date;
}

export interface Shortcut {
    callback: () => void;
    anywhere: boolean;
    preventDefault: boolean;
}

export type ShortcutMap = { [key: string]: Shortcut};

interface StateI {
    todos: TodoMap;
    hash: number;
    syncActions: ActionDummy[];
    undoAction?: UndoInfo;
    loginDetails?: LoginDetails;
    modal: any;
    message?: Message;
    onlineAsOf?: Date
    shortcuts: ShortcutMap;
}
export type State = Immutable.Immutable<StateI>;

const s: StateI = {
    todos: {},
    hash: hash({}),
    syncActions: [],
    modal: null,
    shortcuts: {}
}
export const initState: State = Immutable(s);

export const store = createStore(reducer, initState, (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__());
store.dispatch(setState(stateFromStorage()));

export function getTodo(id: string) {
    return store.getState().todos[id].asMutable();
}

export function dueTodos() {
    const now = Date.now();
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            return !t.done && t.deadline && t.deadline.getTime() <= now;
        })
        .sort((a, b) => itemCompare(a, b));
}

export function deadlineTodos() {
    const now = Date.now();
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            return !t.hide_until_done && !t.done && t.deadline && t.deadline.getTime() > now;
        })
        .sort((a, b) => itemCompare(a, b));
}

export function upcomingTodos() {
    const now = Date.now();
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            return !t.done && t.deadline && t.deadline.getTime() > now;
        })
        .sort((a, b) => itemCompare(a, b));
}

export function otherTodos() {
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            return !t.done && !t.deadline;
        })
        .sort((a, b) => itemCompare(a, b));
}

export function completedTodos() {
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            return t.done;
        })
        .sort((a, b) => completedCompare(a, b));
}

export function pendingUndo() {
    return store.getState().undoAction;
}
