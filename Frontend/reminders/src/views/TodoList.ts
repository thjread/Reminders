import m from "mithril";
import Item from "./Item";

interface Attrs {
    todoIds: string[];
}


export default function () {
    let selected: string | null = null;

    function toggleSelect(id: string) {
        if (selected === id) {
            selected = null;
        } else {
            selected = id;
        }
    }

    const TodoList: m.Component<Attrs> = {
        view: function(vnode) {
            return m("ul.todo-list", vnode.attrs.todoIds.map(id => {
                return m(Item, {key: id, id: id, selectCallback: toggleSelect, selected: selected === id});
            }));
        }
    };

    return TodoList;
};
