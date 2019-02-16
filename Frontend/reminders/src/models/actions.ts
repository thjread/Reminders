import { createAction } from "typesafe-actions";
import uuidv4 from "uuid/v4";

import { store, TodoMap, State, getTodo, ActionDummy, Message,
         Shortcut } from "./store";
import { ServerTodoRow, serverRowToTodo, serverUpdate } from "./update";

export const setModal = createAction("SET_MODAL", resolve => {
    return (modal: any) => {
        return resolve({modal});
    }
})

export const logoutResetStore = createAction("LOGOUT_RESET_STORE", resolve => {
    return () => {
        return resolve();
    }
})

export const setState = createAction("SET_STATE", resolve => {
    return (state: State) => {
        return resolve({state});
    }
})

export const setServerTodos = createAction("SET_SERVER_TODOS", resolve => {
    return (serverTodos: ServerTodoRow[]) => {
        let todos: TodoMap = {};
        serverTodos.forEach(row => {
            todos[row.id] = serverRowToTodo(row);
        })
        return resolve({todos});
    }
})

export const createTodo = createAction("CREATE_TODO", resolve => {
    return (title: string, deadline: Date | null | undefined, done: boolean, done_time: Date | null | undefined, create_time: Date, id: string = uuidv4()) => {
        const action = resolve({id, title, deadline, done, done_time, create_time, action_id: uuidv4()});
        store.dispatch(syncAction(action));
        serverUpdate();
        store.dispatch(setUndoAction(() => deleteTodo(id)))
        return action;
    }
})

export const editTodo = createAction("EDIT_TODO", resolve => {
    return (id: string, title: string, deadline: Date | null | undefined) => {
        const action = resolve({id, title, deadline, action_id: uuidv4()});
        const todo = getTodo(id);
        store.dispatch(syncAction(action));
        serverUpdate();
        store.dispatch(setUndoAction(() => editTodo(id, todo.title, todo.deadline)));
        return action;
    }
})

export const toggleDone = createAction("TOGGLE_DONE", resolve => {
    return (id: string, done: boolean) => {
        let done_time = undefined;
        if (done) {
            done_time = new Date();
        }
        const action = resolve({id, done, done_time, action_id: uuidv4()});
        store.dispatch(syncAction(action));
        serverUpdate();
        store.dispatch(setUndoAction(() => toggleDone(id, !done)));// TODO undo doesn't set correct done_time
        return action;
    }
})

export const deleteTodo = createAction("DELETE_TODO", resolve => {
    return (id: string) => {
        const action = resolve({id, action_id: uuidv4()});
        const todo = getTodo(id);
        store.dispatch(syncAction(action));
        serverUpdate();
        store.dispatch(setUndoAction(() => createTodo(todo.title, todo.deadline, todo.done, todo.done_time, todo.create_time, id)));
        return action;
    }
})

export const syncAction = createAction("SYNC_ACTION", resolve => {
    return (action: ActionDummy) => {
        return resolve({action});
    }
})

export const setUndoAction = createAction("SET_UNDO_ACTION", resolve => {
    return (redoAction: (() => ActionDummy) | null) => {
        if (redoAction) {
            return resolve({info: {redoAction, time: new Date()}});
        } else {
            return resolve({info: null});
        }
    }
})

export const dismissUndo = createAction("DISMISS_UNDO", )

export const syncActionSynced = createAction("SYNC_ACTION_SYNCED", resolve => {
    return (action_id: string) => {
        return resolve({action_id});
    }
})

// TODO allow multiple messages?
export const setMessage = createAction("SET_MESSAGE", resolve => {
    return (message: Message | undefined) => {
        return resolve({message});
    }
})

export const setOnlineAsOf = createAction("SET_ONLINE_AS_OF", resolve => {
    return (time: Date | undefined) => {
        return resolve({time});
    }
})


export const addShortcut = createAction("ADD_SHORTCUT", resolve => {
    return (code: string, shortcut: Shortcut) => {
        return resolve({code, shortcut})
    }
})

export const removeShortcut = createAction("REMOVE_SHORTCUT", resolve => {
    return (code: string) => {
        return resolve({code})
    }
})
