import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {store, dueTodos, deadlineTodos, otherTodos, completedTodos, pendingUndo} from "../models/store";
import {addShortcut, removeShortcut} from "../models/actions";
import {logout} from "../models/auth";
import {undo, dismissUndo, create} from "../models/ui";
import { CLOUD_SVG } from "./Icons";

const UNDO_SHOW_TIME = 10*1000;// 10 seconds
const SYNC_DISPLAY_TIME = 10*1000;// 10 seconds

export enum Show {
    Normal,
    Completed
}

interface Attrs {
    show: Show;
}

const TodoPage: m.Component<Attrs> = {
    oninit: function() {
        store.dispatch(addShortcut("Enter 000", {
            callback: create,
            anywhere: false,
            preventDefault: true
        }));
    },

    onremove: function() {
        store.dispatch(removeShortcut("Enter 000"));
    },

    view: function(vnode) {
        const undoAction = pendingUndo();
        let showUndo = false;
        if (undoAction && (Date.now() - undoAction.time.getTime()) < UNDO_SHOW_TIME) {
            showUndo = true;
        }
        let showSynced = false;
        const state = store.getState();
        if (state.syncActions.length === 0 && state.onlineAsOf && Date.now() - state.onlineAsOf.getTime() < SYNC_DISPLAY_TIME && navigator.onLine !== false) {
            showSynced = true;
        }

        let todoSections: (m.Vnode | undefined)[] = [];
        function section(ids: string[], title: string) {
            return ids.length > 0 ? m(TodoSection, {title: title, key: title}, m(TodoList, {todoIds: ids})) : undefined;
        }
        switch (vnode.attrs.show) {
            case Show.Normal: {
                const due = dueTodos();
                const deadline = deadlineTodos();
                const other = otherTodos();
                todoSections = [
                    section(due, "Due"),
                    section(other, "Tasks"),
                    section(deadline, "Deadlines")
                ];
                break;
            }
            case Show.Completed: {
                const completed = completedTodos();
                todoSections = [
                    section(completed, "Completed")
                ]
                break;
            }
        }
        return [
            m("header.header", [
                m("div.logo", [m("img.logo-icon", {src: "images/logo.svg", alt: "Logo"}), "Reminders"]),
                m("div.header-last", [
                    m("div.cloud", { class: showSynced ? undefined : "cloud-hidden" }, m.trust(CLOUD_SVG)),
                    m("button.pill-button.on-primary", {onclick: logout}, "Log out")
                 ])
            ]),
            m("main.todo-container", todoSections),
            m("div.undo", {tabinput: showUndo ? 0 : -1, class: showUndo ? undefined : "undo-hidden" }, [m("button.undo-button", {onclick: undo}, "Undo"), m("button.dismiss-button", {onclick: dismissUndo}, "✕")]),
            m("button.fab", {onclick: create}, "+")
        ]}
}

export default TodoPage;
