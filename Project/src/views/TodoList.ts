import m from "mithril";
import Item from "./Item";

interface Attrs {
    todoIds: string[];
}

const TodoList: m.Component<Attrs> = {
    view: function(vnode) {
        return m("ul.todo-list", vnode.attrs.todoIds.map(id => {
            return m(Item, {id});
        }));
    }
};

export default TodoList;
