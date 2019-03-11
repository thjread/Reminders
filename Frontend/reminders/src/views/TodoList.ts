import m from "mithril";
import Item from "./Item";

interface Attrs {
    todoIds: string[];
}


export default function () {
    let selected: string | null = null;
    let first_paint = true;

    function toggleSelect(id: string) {
        if (selected === id) {
            selected = null;
        } else {
            selected = id;
        }
    }

    const TodoList: m.Component<Attrs> = {
        oninit: function() {
            selected = null;
            first_paint = true;
        },

        view: function(vnode) {
            const animate_enter = !first_paint;
            first_paint = false;

            // deselect item if it's gone
            if (selected && !vnode.attrs.todoIds.includes(selected)) {
                selected = null;
            }
            return m("ul.todo-list", vnode.attrs.todoIds.map(id => {
                return m(Item, {key: id, id: id, selectCallback: toggleSelect, selected: selected === id, animate_enter});
            }));
        }
    };

    return TodoList;
};
