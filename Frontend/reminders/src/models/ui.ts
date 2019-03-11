import m from "mithril";

import { store, pendingUndo, Message } from "./store";
import { setModal, setUndoAction, syncAction, setMessage } from "./actions";
import { Action } from "./reducer";
import Edit from "../views/Edit";
import { serverUpdate } from "./update";
import { MESSAGE_SHOW_TIME } from "../views/Message"

export function undo() {
    const undo = pendingUndo();
    if (undo) {
        store.dispatch(undo.redoAction() as Action);
        store.dispatch(setUndoAction(null));
        serverUpdate();
    }
}

export function dismissUndo() {
    store.dispatch(setUndoAction(null));
}

export function showMessage(text: string) {
    const message: Message = {
        text,
        time: new Date()
    }
    store.dispatch(setMessage(message));
    setTimeout(() => m.redraw(), MESSAGE_SHOW_TIME + 100);
}

export function clearMessage() {
    store.dispatch(setMessage(undefined));
}

export function handleShortcuts(e: KeyboardEvent) {
    const state = store.getState();
    if (e.code && state.shortcutStack.length > 0) {
        const shortcuts = state.shortcutStack[0];
        const shortcut = shortcuts[e.code.toString() + " " + (+e.ctrlKey) + (+e.shiftKey) + (+e.altKey)]
        if (shortcut) {
            const tag = (e.target as HTMLElement).tagName;
            if (!shortcut.anywhere && (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA")) {
                return;
            }
            if (shortcut.preventDefault) {
                e.preventDefault();
            }
            shortcut.callback();
            m.redraw();
        }
    }
}
