import m from "mithril";

interface Attrs {
    animate_enter: boolean;
}

const TodoSectionWrapper = (): m.Component<Attrs> => {
    let route: string | null;

    return {
        oninit() {
            route = m.route.get();
        },

        oncreate(vnode) {
            if (vnode.attrs.animate_enter) {
                vnode.dom.classList.add("section-enter");
                vnode.dom.addEventListener("animationend", () => vnode.dom.classList.remove("section-enter"));
            }
        },

        onbeforeremove(vnode: any) {
            if (m.route.get() === route) { // only animate when not changing page
                vnode.dom.classList.add("section-exit");
                return new Promise((resolve: any) => {
                    vnode.dom.addEventListener("animationend", resolve);
                });
            }
        },

        view(vnode) {
            return m("section.todo-section.desktop-animate-horizontal.desktop-pad", [
                vnode.children,
            ]);
        },
    };
};

export default TodoSectionWrapper;
