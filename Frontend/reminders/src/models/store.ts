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

type ImmutableTodo = Immutable.Immutable<Todo>;

// comparators take the todo objects directly rather than looking ids up via
// getTodo: getTodo deep-clones, and a sort makes O(n log n) comparator calls
function itemCompare(ta: ImmutableTodo, tb: ImmutableTodo, idA: string, idB: string) {
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

function completedCompare(ta: ImmutableTodo, tb: ImmutableTodo, idA: string, idB: string) {
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

function dateCompare(a: Date | Immutable.ImmutableDate | undefined,
                     b: Date | Immutable.ImmutableDate | undefined,
                     undefinedLower: boolean) {
    if (a) {
        if (b) {
            if (a.getTime() < b.getTime()) {
                return -1;
            } else if (b.getTime() < a.getTime()) {
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

// read-only view of a todo, without getTodo's deep clone
export function getTodoImmutable(id: string): ImmutableTodo | undefined {
    return store.getState().todos[id];
}

export function dueTodos() {
    const now = Date.now();
    const todos = store.getState().todos;
    return Object.keys(todos)
        .filter((id) => {
            const t = todos[id];
            return !t.done && t.deadline && t.deadline.getTime() <= now;
        })
        .sort((a, b) => itemCompare(todos[a], todos[b], a, b));
}

export function deadlineTodos() {
    const now = Date.now();
    const todos = store.getState().todos;
    return Object.keys(todos)
        .filter((id) => {
            const t = todos[id];
            return !t.hide_until_done && !t.done && t.deadline && t.deadline.getTime() > now;
        })
        .sort((a, b) => itemCompare(todos[a], todos[b], a, b));
}

export function upcomingTodos() {
    const now = Date.now();
    const todos = store.getState().todos;
    return Object.keys(todos)
        .filter((id) => {
            const t = todos[id];
            return !t.done && t.deadline && t.deadline.getTime() > now;
        })
        .sort((a, b) => itemCompare(todos[a], todos[b], a, b));
}

export function otherTodos() {
    const todos = store.getState().todos;
    return Object.keys(todos)
        .filter((id) => {
            const t = todos[id];
            return !t.done && !t.deadline;
        })
        .sort((a, b) => itemCompare(todos[a], todos[b], a, b));
}

// the completed list is by far the largest, and doesn't depend on the current
// time, so cache it on the todos map reference (seamless-immutable guarantees
// a new reference whenever anything changes)
let completedCache: { todos: unknown; result: string[] } | null = null;

export function completedTodos() {
    const todos = store.getState().todos;
    if (completedCache && completedCache.todos === todos) {
        return completedCache.result;
    }
    const result = Object.keys(todos)
        .filter((id) => todos[id].done)
        .sort((a, b) => completedCompare(todos[a], todos[b], a, b));
    completedCache = { todos, result };
    return result;
}

export function pendingUndo() {
    return store.getState().undoAction;
}
