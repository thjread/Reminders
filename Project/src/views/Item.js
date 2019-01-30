var m = require("mithril");
var State = require("../models/State");

module.exports = {
    view: function(vnode) {
        const item = State.todos[vnode.attrs.id];

        return m("li.item", [
            m("input", {type: "checkbox", checked: item.done}),
            m("h2.item-title", item.title),
            item.deadline !== null ? m("h3.item-deadline", item.deadline.toString()) : undefined
        ]);
    }
}
