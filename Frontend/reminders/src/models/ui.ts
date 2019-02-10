import { store, pendingUndo } from "./store";
import { setModal, setUndoAction, syncAction } from "./actions";
import { Action } from "./reducer";
import Edit from "../views/Edit";
import { serverUpdate } from "./update";

export function create() {
    import(/* webpackChunkName: "sugar", webpackPreload: true */ "../sugar-utils").then(({sugarParseDate}) => {
        store.dispatch(setModal(Edit(sugarParseDate)));
    })
}

export function edit(id: string) {
    import(/* webpackChunkName: "sugar", webpackPreload: true */ "../sugar-utils").then(({sugarParseDate}) => {
        store.dispatch(setModal(Edit(sugarParseDate, id)));
    })
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
