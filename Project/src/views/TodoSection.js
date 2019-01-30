var m = require("mithril");

module.exports = {
    view: function(vnode) {
        return m("section.todos-section", [
            m("h1.section-title", vnode.attrs.title),
            vnode.children
        ]);
    }
}
