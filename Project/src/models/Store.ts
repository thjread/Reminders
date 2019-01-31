import { createStore } from "redux";
import reducer from "./Reducer";

interface Item {
    title: string,
    deadline?: Date,
    done: boolean
}

function itemCompare(a: Item, b: Item) {
    if (!b.deadline) {
        if (!a.deadline) {
            return 0;
        } else {
            return -1;
        }
    } else if (!a.deadline) {
        return 1;
    } else if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
}

export interface State {
    todos: { [id: string]: Item };
    currentDate: Date;
}

var testState: State = {
    todos: {
        "0134": {
            title: "Hand in Linear Algebra",
            deadline: new Date("2019-01-28T12:00:00.000Z"),
            done: false
        },
        "2011": {
            title: "Hand in Methods",
            deadline: new Date("2019-01-29T12:00:00.000Z"),
            done: false
        },
        "0008": {
            title: "Do laundry",
            done: false
        },
        "1000": {
            title: "Hand in Analysis",
            deadline: new Date("2019-01-30T12:00:00.000Z"),
            done: false
        },
        "0500": {
            title: "Be born",
            done: true
        }
    },
    currentDate: new Date("2019-01-29T13:00:00.000Z")
}

const store = createStore(reducer, testState);

export function getTodo(id: string) {
    return store.getState().todos[id];
}

export function getCurrentDate() {
    return store.getState().currentDate;
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

export default store;
