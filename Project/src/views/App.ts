import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {dueTodos, laterTodos} from "../models/Store";

export default {
    view: function() {
        return [
            m(TodoSection, {title: "Todo"}, m(TodoList, {todoIds: dueTodos()})),
            m(TodoSection, {title: "Deadlines"}, m(TodoList, {todoIds: laterTodos()}))
        ]}
}
