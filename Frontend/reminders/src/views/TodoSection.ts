import m from "mithril";

interface Attrs {
    title: string;
    animateEnter: boolean;
    desktopAnimateHorizontal: boolean;
    desktopPad: boolean;
}

const TodoSection = (): m.Component<Attrs> => {
    let route: string | null;

    return {
        oninit() {
            route = m.route.get();
        },

        oncreate(vnode) {
            if (vnode.attrs.animateEnter) {
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
            const classes = [];
            if (vnode.attrs.desktopAnimateHorizontal) {
                classes.push("desktop-animate-horizontal");
            }
            if (vnode.attrs.desktopPad) {
                classes.push("desktop-pad");
            }
            return m("section.todo-section", {
                class: classes.join(" "),
            }, [
                m("h1.section-title.title-font", vnode.attrs.title),
                m("div.section-before"),
                vnode.children,
                m("div.section-after"),
            ]);
        },
    };
};

export default TodoSection;
