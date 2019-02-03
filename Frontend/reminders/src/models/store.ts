import { createStore } from "redux";
import Immutable from "seamless-immutable";
import reducer from "./reducer";

export interface Todo {
    title: string,
    deadline?: Date,
    done: boolean
}
export type TodoMap = { [id: string]: Todo };

function itemCompare(a: Todo, b: Todo) {
    if (a.deadline) {
        if (b.deadline) {
            if (a.deadline < b.deadline) {
                return -1;
            } else if (b.deadline < a.deadline) {
                return 1;
            } else {
                return 0;
            }
        } else {
            return -1;
        }
    } else {
        if (b.deadline) {
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
}
export type State = Immutable.Immutable<StateI>;

/*var testState: State = Immutable({
    todos: {
        "268a2ce1-0e1c-4379-a3c5-1f908c1f713d": {
            title: "Hand in Linear Algebra",
            deadline: new Date("2019-01-28T12:00:00.000Z"),
            done: false
        },
        "602f4612-3f0a-4a8e-b93c-a6a8f54e12f6": {
            title: "Hand in Methods",
            deadline: new Date("2019-01-29T12:00:00.000Z"),
            done: false
        },
        "0018ed61-3687-4301-b763-00c0c5d775e5": {
            title: "Do laundry",
            done: false
        },
        "ebfb1ab2-72d9-41f0-a047-e9aeacca8caa": {
            title: "Hand in Analysis",
            deadline: new Date("2019-01-30T12:00:00.000Z"),
            done: false
        },
        "7b8b9fd6-ddef-4ede-a925-c3201d46bc8e": {
            title: "Be born",
            done: true
        }
    },
    currentDate: new Date("2019-01-29T13:00:00.000Z"),
    syncActions: []
})*/

const initState: State = Immutable({
  todos: {},
  currentDate: new Date("2019-01-29T13:00:00.000Z"),
  syncActions: []
});

export const store = createStore(reducer, initState, (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__());

export function getTodo(id: string) {
    return store.getState().todos[id].asMutable();
}

export function getCurrentDate() {
    return store.getState().currentDate.asMutable();
}

export function todoDue(id: string) {
    const deadline = getTodo(id).deadline;
    if (deadline) {
        return getCurrentDate() > deadline;
    } else {
        return true;
    }
}

export function dueTodos() {
    return Object.keys(store.getState().todos).filter(todoDue).sort((a, b) => itemCompare(getTodo(a), getTodo(b)));
}

export function laterTodos() {
    return Object.keys(store.getState().todos).filter(id => !todoDue(id)).sort((a, b) => itemCompare(getTodo(a), getTodo(b)));
}
