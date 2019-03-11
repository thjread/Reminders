import m from "mithril";
import Item from "./Item";

interface Attrs {
    todoIds: string[];
}

export default function() {
    let selected: string | null = null;
    let firstPaint = true;

    function toggleSelect(id: string) {
        if (selected === id) {
            selected = null;
        } else {
            selected = id;
        }
    }

    const TodoList: m.Component<Attrs> = {
        oninit() {
            selected = null;
            firstPaint = true;
        },

        view(vnode) {
            const animateEnter = !firstPaint;
            firstPaint = false;

            // deselect item if it's gone
            if (selected && !vnode.attrs.todoIds.includes(selected)) {
                selected = null;
            }
            return m("ul.todo-list", vnode.attrs.todoIds.map((id) => {
                return m(Item, { key: id, id, selectCallback: toggleSelect, selected: selected === id, animateEnter});
            }));
        },
    };

    return TodoList;
}
