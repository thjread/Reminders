import m from "mithril";
import { store, initState, Todo } from "./store";
import { syncActionSynced, setServerTodos, setOnlineAsOf } from "./actions";
import { Action } from "./reducer";
import { dateTimeReviver } from "../utils";
import { logout, LoginDetails } from "./auth";
import { showMessage } from "./ui";
import { hash } from "./serialize";

declare var API_URI: boolean; // provided by webpack

interface SyncActionDummy {
    type: string;
    payload: any;
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

export function logoutClearStorage() {
    const state = store.getState();
    if (state.loginDetails) {
        localStorage.removeItem(state.loginDetails.userid);
    }
    localStorage.removeItem("loginDetails");
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
            is = is.set("hash", hash(state.todos));
            is = is.set("syncActions", state.syncActions);
        }
    }
    return is;
}

function serverError(actions: SyncActionDummy[]) {
    if (actions.length > 0) {
        showMessage(
            "Server error - offline actions not saved (you may need to close and reopen the webpage)");
        // give up on actions
        actions.forEach((a) => store.dispatch(syncActionSynced(a.payload.action_id)));
    } else {
        showMessage("Server error (you may need to close and reopen the webpage)");
    }
    setOnlineAsOf(undefined);
}

// action must have an action_id field with a uuidv4 in it
export function serverUpdate(actions: SyncActionDummy[]
                             = store.getState().syncActions.asMutable()) {
    const state = store.getState();
    if (state.loginDetails) {
        if (navigator.onLine !== false) {
            // @ts-ignore - TODO remove when @types/mithril is updated for v2.0
            return m.request({
                method: "PUT",
                url: API_URI+"/update",
                timeout: 5000,
                data: {
                    jwt: state.loginDetails.jwt,
                    batch: actions,
                    expected_hash: state.hash,
                },
                deserialize: (v) => v, // prevent default JSON deserialization
            }).then((rawResponse: string) => {
                let response;
                try {
                    response = JSON.parse(rawResponse);
                } catch (e) {
                    console.warn("Could not parse response from server");
                    serverError(actions);
                }

                if (response) {
                    switch (response.type) {
                        case "SUCCESS": {
                            actions.forEach((a) => store.dispatch(syncActionSynced(a.payload.action_id)));
                            store.dispatch(setOnlineAsOf(new Date()));
                            break;
                        }
                        case "HASH_MISMATCH": {
                            const serverHash = response.hash;
                            const todos = response.todos;
                            actions.forEach((a) => store.dispatch(syncActionSynced(a.payload.action_id)));
                            // tslint:disable-next-line:no-console
                            console.log("Local hash " + state.hash + " does not match hash " +
                                        serverHash + " from server - updating");
                            updateWithServerTodos(todos as ServerTodoRow[], serverHash);
                            store.dispatch(setOnlineAsOf(new Date()));
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
                            console.warn("Unexpected response from server");
                            serverError(actions);
                    }
                }
            }).catch((e: any) => {
                if (e.code !== 0) {
                    console.warn("Server responded with error " + e.code);
                }
                if (e.code !== 0 && e.code !== 503 && e.code !== 521 && e.code !== 523 && e.code !== 525) { // got a response from server
                    // 503, 521, 525 all errors produced by Cloudflare when server is down
                    serverError(actions);
                } else {
                    setOnlineAsOf(undefined);
                }
            });
        } else {
            m.redraw(); // make sure other UI elements refresh e.g. todos that have reached their deadline
        }
    }
}

export interface ServerTodoRow {
    id: string;
    title: string;
    deadline: string | null;
    done: boolean;
    done_time: string | null;
    create_time: string;
    hide_until_done: boolean;
    highlight: boolean;
}

export function serverRowToTodo(t: ServerTodoRow) {
    const todo: Todo = {
        title: t.title,
        done: t.done,
        create_time: new Date(t.create_time+"Z"),
        hide_until_done: t.hide_until_done,
        highlight: t.highlight,
    };
    if (t.deadline) {
        todo.deadline = new Date(t.deadline+"Z");
    }
    if (t.done_time) {
        todo.done_time = new Date(t.done_time+"Z");
    }
    return todo;
}

function updateWithServerTodos(todos: ServerTodoRow[], serverHash: number) {
    store.dispatch(setServerTodos(todos, serverHash));
    store.getState().syncActions.forEach((a) => store.dispatch(a as Action));
}
