import m from "mithril";

interface Attrs {
    title: string;
    animate_enter: boolean;
}

const TodoSection = function (): m.Component<Attrs> {
    let route : string | null;

    return {
        oninit: function() {
            route = m.route.get();
        },

        oncreate: function(vnode) {
            if (vnode.attrs.animate_enter) {
                vnode.dom.classList.add("section-enter");
                vnode.dom.addEventListener("animationend", () => vnode.dom.classList.remove("section-enter"));
            }
        },

        onbeforeremove: function(vnode: any) {
            if (m.route.get() === route) {// only animate when not changing page
                vnode.dom.classList.add("section-exit");
                return new Promise(function(resolve: any) {
                    vnode.dom.addEventListener("animationend", resolve);
                })
            }
        },

        view: function(vnode) {
            return m("section.todo-section", [
                m("h1.section-title.title-font", vnode.attrs.title),
                m("div.section-before"),
                vnode.children,
                m("div.section-after")
            ]);
        }
    }
};

export default TodoSection;
