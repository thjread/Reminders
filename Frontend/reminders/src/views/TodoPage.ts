import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {dueTodos, laterTodos} from "../models/store";
import {logout} from "../models/auth";
import {create} from "../models/ui";

export default {
    view: function() {
        return [
            m("header.header", [
                m("div.logo", "Reminders"),
                m("button.pill-button.on-primary", {onclick: logout}, "Log out")
            ]),
            m("main.todo-container", [
                m(TodoSection, {title: "Due"}, m(TodoList, {todoIds: dueTodos()})),
                m(TodoSection, {title: "Upcoming"}, m(TodoList, {todoIds: laterTodos()}))
            ]),
            m("button.fab", {onclick: create}, "+")
        ]}
}
