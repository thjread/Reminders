import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {dueTodos, laterTodos} from "../models/store";

export default {
    view: function() {
        return m("main.todo-container", [
            m(TodoSection, {title: "Due"}, m(TodoList, {todoIds: dueTodos()})),
            m(TodoSection, {title: "Upcoming"}, m(TodoList, {todoIds: laterTodos()}))
        ])}
}
