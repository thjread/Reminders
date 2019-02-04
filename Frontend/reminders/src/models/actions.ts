import { createAction } from "typesafe-actions";
import m from "mithril";
import uuidv4 from "uuid/v4";

import { store, Todo, TodoMap } from "./store";
import { loggedIn } from "./auth";

interface ActionDummy {
    type: string,
    payload: any
}

export function storeState() {
    const state = store.getState();
    localStorage.setItem("state", JSON.stringify({
        todos: state.todos,
        syncActions: state.syncActions
    }));
    console.log("Saved to localStorage");
}

// action must have an action_id field with a uuidv4 in it
export function serverUpdate(actions: ActionDummy[]
                             = store.getState().syncActions.asMutable()) {
    if (!loggedIn) return;

    storeState();
    if (navigator.onLine !== false) {
        m.request({
            method: "PUT",
            url: "http://localhost:3000/api/update",
            data: actions
        }).then(function (todos) {
            actions.forEach(a => store.dispatch(syncActionSynced(a.payload.action_id)));
            updateWithServerTodos(todos as ServerTodoRow[]);
            storeState();
        }).catch(function (e) {
            if (e.code !== 0) {// got a response from server
                console.log("Server error " + e.message);
                // give up on actions
                actions.forEach(a => store.dispatch(syncActionSynced(a.payload.action_id)));
                askServerForTodos();// try to reset to server state
            }
        });
    }
}

export function askServerForTodos() {
    serverUpdate([]);
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
    return todo;
}

function updateWithServerTodos(todos: ServerTodoRow[]) {
    store.dispatch(setServerTodos(todos));
    store.getState().syncActions.forEach(a => store.dispatch(a));
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
        store.dispatch(syncAction(action));
        serverUpdate();
        return action;
    }
})

export const syncAction = createAction("SYNC_ACTION", resolve => {
    return (action: ActionDummy) => {
        return resolve({action});
    }
})

export const syncActionSynced = createAction("SYNC_ACTION_SYNCED", resolve => {
    return (action_id: string) => {
        return resolve({action_id});
    }
})
