import m from "mithril";

interface Attrs {
    title: string;
}

const TodoSection: m.Component<Attrs> = {
    view: function(vnode) {
        return m("section.todo-section", [
            m("h1.section-title.title-font", vnode.attrs.title),
            vnode.children
        ]);
    }
};

export default TodoSection;
