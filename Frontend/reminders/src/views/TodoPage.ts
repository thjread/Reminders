import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {dueTodos, laterTodos} from "../models/store";
import {logout} from "../models/auth";
import {create} from "../models/ui";

export default {
    view: function() {
        return [
            m("main.todo-container", [
                m(TodoSection, {title: "Due"}, m(TodoList, {todoIds: dueTodos()})),
                m(TodoSection, {title: "Upcoming"}, m(TodoList, {todoIds: laterTodos()}))
            ]),
            m("button.login-button", {onclick: logout}, "Log out"),// TODO
            m("button.login-button", {onclick: create}, "New todo")// TODO
        ]}
}
