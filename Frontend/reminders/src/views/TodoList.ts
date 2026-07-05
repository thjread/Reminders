import m from "mithril";
import { getTodoImmutable } from "../models/store";
import Item from "./Item";

interface Attrs {
    todoIds: string[];
    // set false to never animate items in (e.g. large "Show more" batches)
    animateItems?: boolean;
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
            const animateEnter = !firstPaint && vnode.attrs.animateItems !== false;
            firstPaint = false;

            // deselect item if it's gone
            if (selected && !vnode.attrs.todoIds.includes(selected)) {
                selected = null;
            }
            return m("ul.todo-list", vnode.attrs.todoIds.map((id) => {
                const todo = getTodoImmutable(id);
                if (!todo) {
                    console.warn(`Todo ${id} does not exist`);
                    return;
                }
                return m(Item, {
                    key: id+todo.highlight,
                    id,
                    selectCallback: toggleSelect,
                    selected: selected === id,
                    animateEnter,
                });
            }));
        },
    };

    return TodoList;
}
