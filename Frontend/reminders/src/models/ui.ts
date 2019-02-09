import { store, pendingUndo } from "./store";
import { setModal, setUndoAction, syncAction } from "./actions";
import { Action } from "./reducer";
import Edit from "../views/Edit";
import { serverUpdate } from "./update";

export function create() {
    store.dispatch(setModal(Edit()));
}

export function edit(id: string) {
    store.dispatch(setModal(Edit(id)));
}

export function undo() {
    const undo = pendingUndo();
    if (undo) {
        store.dispatch(undo.redoAction() as Action);
        store.dispatch(setUndoAction(null));
    }
}

export function dismissUndo() {
    store.dispatch(setUndoAction(null));
}
