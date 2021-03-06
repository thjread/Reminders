import { createStore } from "redux";
import Immutable from "seamless-immutable";
import { LoginDetails } from "./auth";
import reducer from "./reducer";
import { setState } from "./actions";
import { stateFromStorage } from "./update";
import { hash } from "./serialize";

export interface Todo {
    title: string;
    deadline?: Date;
    done: boolean;
    done_time?: Date;
    create_time: Date;
    hide_until_done: boolean;
    highlight: boolean;
}
export interface TodoMap { [id: string]: Todo; }

function itemCompare(idA: string, idB: string) {
    const ta = getTodo(idA);
    const tb = getTodo(idB);
    if (!ta || !tb) {
        console.warn(`Todo ${ta} or ${tb} does not exist`);
        return 0;
    }
    const comp0 = highlightCompare(ta.highlight, tb.highlight);
    if (comp0 === 0) {
        const comp1 = dateCompare(ta.deadline, tb.deadline, true);
        if (comp1 === 0) {
            const comp2 = dateCompare(ta.create_time, tb.create_time, false);
            if (comp2 === 0) {
                if (idA < idB) { // stable tie break
                    return -1;
                } else {
                    return 1;
                }
            } else {
                return -comp2; // most recently created first
            }
        } else {
            return comp1; // oldest deadline first
        }
    } else {
        return comp0;
    }
}

function completedCompare(idA: string, idB: string) {
    const ta = getTodo(idA);
    const tb = getTodo(idB);
    if (!ta || !tb) {
        console.warn(`Todo ${ta} or ${tb} does not exist`);
        return 0;
    }
    const comp1 = dateCompare(ta.done_time, tb.done_time, false);
    if (comp1 === 0) {
        if (idA < idB) { // stable tie break
            return -1;
        } else {
            return 1;
        }
    } else {
        return -comp1; // most recently completed first
    }
}

function highlightCompare(a: boolean, b: boolean) {
    if (a && !b) {
        return -1;
    } else if (b && !a) {
        return 1;
    } else {
        return 0;
    }
}

function dateCompare(a: Date | undefined, b: Date | undefined, undefinedLower: boolean) {
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
            return undefinedLower ? -1 : 1;
        }
    } else {
        if (b) {
            return undefinedLower ? 1 : -1;
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

export interface ShortcutMap { [key: string]: Shortcut; }

interface StateI {
    todos: TodoMap;
    hash: number;
    syncActions: ActionDummy[];
    undoAction?: UndoInfo;
    loginDetails?: LoginDetails;
    modal: any;
    message?: Message;
    onlineAsOf?: Date;
    shortcutStack: ShortcutMap[];
}
export type State = Immutable.Immutable<StateI>;

const s: StateI = {
    todos: { },
    hash: hash({ }),
    syncActions: [],
    modal: null,
    shortcutStack: [],
};
export const initState: State = Immutable(s);

// tslint:disable-next-line:max-line-length
export const store = createStore(reducer, initState, (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__());
store.dispatch(setState(stateFromStorage()));

export function getTodo(id: string) {
    const todo: Immutable.Immutable<Todo> | undefined = store.getState().todos[id];
    if (todo) {
        return todo.asMutable({ deep: true });
    } else {
        return undefined;
    }
}

export function dueTodos() {
    const now = Date.now();
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            if (t) {
                return !t.done && t.deadline && t.deadline.getTime() <= now;
            } else {
                console.warn(`Todo ${id} does not exist`);
                return false;
            }
        })
        .sort((a, b) => itemCompare(a, b));
}

export function deadlineTodos() {
    const now = Date.now();
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            if (t) {
                return !t.hide_until_done && !t.done && t.deadline && t.deadline.getTime() > now;
            } else {
                console.warn(`Todo ${id} does not exist`);
                return false;
            }
        })
        .sort((a, b) => itemCompare(a, b));
}

export function upcomingTodos() {
    const now = Date.now();
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            if (t) {
                return !t.done && t.deadline && t.deadline.getTime() > now;
            } else {
                console.warn(`Todo ${id} does not exist`);
                return false;
            }
        })
        .sort((a, b) => itemCompare(a, b));
}

export function otherTodos() {
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            if (t) {
                return !t.done && !t.deadline;
            } else {
                console.warn(`Todo ${id} does not exist`);
                return false;
            }
        })
        .sort((a, b) => itemCompare(a, b));
}

export function completedTodos() {
    return Object.keys(store.getState().todos)
        .filter((id) => {
            const t = getTodo(id);
            if (t) {
                return t.done;
            } else {
                console.warn(`Todo ${id} does not exist`);
                return false;
            }
        })
        .sort((a, b) => completedCompare(a, b));
}

export function pendingUndo() {
    return store.getState().undoAction;
}
