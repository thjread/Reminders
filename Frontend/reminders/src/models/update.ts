import m from "mithril";
import { store, Todo } from "./store";
import { syncActionSynced, setServerTodos } from  "./actions";

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
    console.log("Saved to localStorage");
}

// action must have an action_id field with a uuidv4 in it
export function serverUpdate(actions: ActionDummy[]
                             = store.getState().syncActions.asMutable()) {
    console.log(JSON.stringify(actions));
    const state = store.getState();
    if (state.loginDetails) {
        storeState();
        if (navigator.onLine !== false) {
            return m.request({
                method: "PUT",
                url: "http://localhost:3000/api/update",
                data: {
                    jwt: state.loginDetails.jwt,
                    batch: actions
                }
            }).then(function (todos) {
                actions.forEach(a => store.dispatch(syncActionSynced(a.payload.action_id)));
                updateWithServerTodos(todos as ServerTodoRow[]);
                storeState();
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
    store.getState().syncActions.forEach(a => store.dispatch(a));
}
