import m from "mithril";

interface Attrs {
    title: string;
}

const TodoSection: m.Component<Attrs> = {
    view: function(vnode) {
        return m("section.todos-section", [
            m("h1.section-title", vnode.attrs.title),
            vnode.children
        ]);
    }
}

export default TodoSection;
