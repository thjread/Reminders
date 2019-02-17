import m from "mithril";
import { store, initState, Todo } from "./store";
import { syncActionSynced, setServerTodos, setOnlineAsOf } from  "./actions";
import { Action } from "./reducer";
import { dateTimeReviver } from "../utils";
import { logout, LoginDetails } from "./auth";
import { showMessage } from "./ui";

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
    } else {
        localStorage.removeItem("loginDetails");
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
                url: API_URI+"/update",
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
                        showMessage("Authentication error");
                        logout();
                        break;
                    case "EXPIRED_TOKEN":
                        showMessage("Saved login details expired - please log in again");
                        logout(false);
                        break;
                    default:
                        showMessage("Server error");
                }

            }).catch(function (e) {
                if (e.code !== 0) {// got a response from server
                    if (actions.length > 0) {
                        showMessage("Server error - offline actions not saved (you may need to close and reopen the webpage)");
                    } else {
                        showMessage("Server error (you may need to close and reopen the webpage)");
                    }
                    // give up on actions
                    actions.forEach(a => store.dispatch(syncActionSynced(a.payload.action_id)));
                    setTimeout(askServerForTodos, 500);// try to reset to server state
                    // TODO do we really want this? or logout on error
                }
                setOnlineAsOf(undefined);
            })
        } else {
            m.redraw();// make sure other UI elements refresh e.g. todos that have reached their deadline
        }
    }
}

export function askServerForTodos() {
    serverUpdate([]);
}

export interface ServerTodoRow {
    id: string;
    title: string;
    deadline: string | null;
    done: boolean;
    done_time: string | null;
    create_time: string;
}

export function serverRowToTodo(t: ServerTodoRow) {
    let todo: Todo = {
        title: t.title,
        done: t.done,
        create_time: new Date(t.create_time)
    }
    if (t.deadline) {
        todo.deadline = new Date(t.deadline);
    }
    if (t.done_time) {
        todo.done_time = new Date(t.done_time);
    }
    return todo;
}

function updateWithServerTodos(todos: ServerTodoRow[]) {
    store.dispatch(setServerTodos(todos));
    store.getState().syncActions.forEach(a => store.dispatch(a as Action));
    store.dispatch(setOnlineAsOf(new Date()));
}
