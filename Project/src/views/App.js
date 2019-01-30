var m = require("mithril");
var TodoSection = require("./TodoSection");
var TodoList = require("./TodoList");

var State = require("../models/State");

module.exports = {
    view: function() {
        return [
            m(TodoSection, {title: "Todo"}, m(TodoList, {todoIds: State.dueTodos()})),
            m(TodoSection, {title: "Deadlines"}, m(TodoList, {todoIds: State.laterTodos()}))
        ]}
}
