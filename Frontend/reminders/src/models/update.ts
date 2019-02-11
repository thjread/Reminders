import m from "mithril";
import { store, initState, Todo } from "./store";
import { syncActionSynced, setServerTodos } from  "./actions";
import { Action } from "./reducer";
import { dateTimeReviver } from "../utils";
import { logout, LoginDetails } from "./auth";

declare var API_URI: boolean;//provided by webpack

interface ActionDummy {
    type: string,
    payload: any
}

export function storeState() {
    const state = store.getState();
    if (state.loginDetails) {
        localStorage.setItem(state.loginDetails.userid, JSON.stringify({
            todos: state.todos,
            syncActions: state.syncActions,
        }));
        localStorage.setItem("loginDetails", JSON.stringify(state.loginDetails));
        console.log("Saved to localStorage");
    } else {
        localStorage.removeItem("loginDetails");
        console.log("Login details removed from localStorage")
    }
}

export function stateFromStorage(loginDetails: LoginDetails | null = null) {
    let is = initState;
    if (!loginDetails) {
        const loginJSON = localStorage.getItem("loginDetails");
        if (loginJSON) {
            loginDetails = JSON.parse(loginJSON);
        }
    }
    if (loginDetails) {
        is = is.set("loginDetails", loginDetails);
        const stateJSON = localStorage.getItem(loginDetails.userid);
        if (stateJSON) {
            const state = JSON.parse(stateJSON, dateTimeReviver);
            is = is.set("todos", state.todos);
            is = is.set("syncActions", state.syncActions);
        }
    }
    console.log("Loaded from storage");
    return is;
}

// action must have an action_id field with a uuidv4 in it
export function serverUpdate(actions: ActionDummy[]
                             = store.getState().syncActions.asMutable()) {
    const state = store.getState();
    if (state.loginDetails) {
        if (navigator.onLine !== false) {
            return m.request({
                method: "PUT",
                url: API_URI+"/update", // TODO make ssl
                data: {
                    jwt: state.loginDetails.jwt,
                    batch: actions
                }
            }).then(function (response: any) {
                switch (response.type) {
                    case "SUCCESS": {
                        const todos = response.todos;
                        actions.forEach(a => store.dispatch(syncActionSynced(a.payload.action_id)));
                        updateWithServerTodos(todos as ServerTodoRow[]);
                        break;
                    }
                    case "INVALID_TOKEN":
                    case "EXPIRED_TOKEN":
                        console.log(response.type);
                        logout();
                        break;
                    default:
                        console.log("Unrecognised server response " + response);
                }

            }).catch(function (e) {
                if (e.code !== 0) {// got a response from server
                    console.log("Server error " + e.message);
                    // give up on actions
                    actions.forEach(a => store.dispatch(syncActionSynced(a.payload.action_id)));
                    setTimeout(askServerForTodos, 500);// try to reset to server state
                    // TODO do we really want this? or logout on error
                }
            })
        }
    }
}

export function askServerForTodos() {
    serverUpdate([]);
}

export interface ServerTodoRow {
    id: string;
    title: string;
    deadline: string;
    done: boolean;
}

export function serverRowToTodo(t: ServerTodoRow) {
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
    store.getState().syncActions.forEach(a => store.dispatch(a as Action));
}
