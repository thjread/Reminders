import { createAction } from "typesafe-actions";
import m from "mithril";
import uuidv4 from "uuid/v4";

import { store, Todo, TodoMap } from "./store";

// action must have an action_id field with a uuidv4 in it
function serverUpdate(method: string, path: string, action: any, data: any) {
    const action_id = action.payload.action_id;
    store.dispatch(offlineAction(action));

    m.request({
        method,
        url: "http://localhost:3000/api/" + path,
        data
    }).then(function (todos) {
        store.dispatch(offlineActionCompleted(action_id));
        updateWithServerTodos(todos as ServerTodoRow[]);
    }).catch(function (e) {
        if (e.code !== 0) {// got a response from server
            console.log("Server error " + e.message);
            store.dispatch(offlineActionCompleted(action_id));// give up on action
            askServerForTodos();// try to reset to server state
        }
    });
}

function askServerForTodos() {
    m.request({
        method: "GET",
        url: "http://localhost:3000/api/todos",
    }).then(function (todos) {
        updateWithServerTodos(todos as ServerTodoRow[]);
    }).catch(function(e) {
        if (e.code !== 0) {// got a response from server
            console.log("Server error " + e.message);
        }
    })
}

interface ServerTodoRow {
    id: string;
    title: string;
    deadline: string;
    done: boolean;
}

function serverRowToTodo(t: ServerTodoRow) {
    let todo: Todo = {
        title: t.title,
        done: t.done
    }
    if (t.deadline) {
        todo.deadline = new Date(t.deadline);
    }
}

function updateWithServerTodos(todos: ServerTodoRow[]) {
    store.dispatch(setServerTodos(todos));
    store.getState().offlineActions.forEach(a => store.dispatch(a));
}

export const setServerTodos = createAction("SET_SERVER_TODOS", resolve => {
    return (serverTodos: ServerTodoRow[]) => {
        let todos: TodoMap = {};
        serverTodos.forEach(row => {
            todos[row.id] = serverRowToTodo(row);
        })
        console.log(todos);
        return resolve({todos});
    }
})

export const toggleDone = createAction("TOGGLE_DONE", resolve => {
    return (id: string, done: boolean) => {
        const action = resolve({id, done, action_id: uuidv4()});
        serverUpdate("PUT", "toggle_done", action, {id, done});
        return action;
    }
})

export const offlineAction = createAction("OFFLINE_ACTION", resolve => {
    return (action: any) => {
        return resolve({action});
    }
})

export const offlineActionCompleted = createAction("OFFLINE_ACTION_COMPLETED", resolve => {
    return (action_id: string) => {
        return resolve({action_id});
    }
})
