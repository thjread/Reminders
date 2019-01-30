import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import State from "../models/State";

export default {
    view: function() {
        return [
            m(TodoSection, {title: "Todo"}, m(TodoList, {todoIds: State.dueTodos()})),
            m(TodoSection, {title: "Deadlines"}, m(TodoList, {todoIds: State.laterTodos()}))
        ]}
}
