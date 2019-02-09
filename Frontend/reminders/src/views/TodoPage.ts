import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {dueTodos, laterTodos, pendingUndo} from "../models/store";
import {logout} from "../models/auth";
import {undo, dismissUndo, create} from "../models/ui";

const UNDO_SHOW_TIME = 10*1000;// 10 seconds

export default {
    view: function() {
        const undoAction = pendingUndo();
        let showUndo = false;
        if (undoAction && (Date.now() - undoAction.time.getTime()) < UNDO_SHOW_TIME) {
            showUndo = true;
        }
        return [
            m("header.header", [
                m("div.logo", "Reminders"),
                m("button.pill-button.on-primary", {onclick: logout}, "Log out")
            ]),
            m("main.todo-container", [
                m(TodoSection, {title: "Due"}, m(TodoList, {todoIds: dueTodos()})),
                m(TodoSection, {title: "Upcoming"}, m(TodoList, {todoIds: laterTodos()}))
            ]),
            m("div.undo", {tabinput: showUndo ? 0 : -1, class: showUndo ? undefined : "undo-hidden" }, [m("button.undo-button", {onclick: undo}, "Undo"), m("button.dismiss-button", {onclick: dismissUndo}, "✕")]),
            m("button.fab", {onclick: create}, "+")
        ]}
}
