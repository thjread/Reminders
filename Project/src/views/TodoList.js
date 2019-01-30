var m = require("mithril");
var Item = require("./Item");

module.exports = {
    view: function(vnode) {
        return m("ul.todo-list", vnode.attrs.todoIds.map(id => {
            return m(Item, {id});
        }));
    }
}
