import { createAction } from "typesafe-actions";
import m from "mithril";
import uuidv4 from "uuid/v4";

import { store, TodoMap } from "./store";
import { ServerTodoRow, serverRowToTodo, serverUpdate } from "./update";

interface ActionDummy {
    type: string,
    payload: any
}

export const setModal = createAction("SET_MODAL", resolve => {
    return (modal: any) => {
        return resolve({modal});
    }
})

export const setLoginDetails = createAction("SET_LOGIN_DETAILS", resolve => {
    return (username: string, userid: string, jwt: string) => {
        return resolve({username, userid, jwt});
    }
})

export const logoutResetStore = createAction("LOGOUT_RESET_STORE", resolve => {
    return () => {
        return resolve();
    }
})

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

export const createTodo = createAction("CREATE_TODO", resolve => {
    return (title: string, deadline: Date | null, done: boolean) => {
        const action = resolve({id: uuidv4(), title, deadline, done, action_id: uuidv4()});
        store.dispatch(syncAction(action));
        serverUpdate();
        return action;
    }
})

export const editTodo = createAction("EDIT_TODO", resolve => {
    return (id: string, title: string, deadline: Date | null, done: boolean) => {
        const action = resolve({id, title, deadline, done, action_id: uuidv4()});
        store.dispatch(syncAction(action));
        serverUpdate();
        return action;
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

export const deleteTodo = createAction("DELETE_TODO", resolve => {
    return (id: string) => {
        const action = resolve({id, action_id: uuidv4()});
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
