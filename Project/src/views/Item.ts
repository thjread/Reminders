import m from "mithril";
import State from "../models/State";

interface Attrs {
    id: string;
}

const Item: m.Component<Attrs> = {
    view: function(vnode) {
        const item = State.todos[vnode.attrs.id];

        return m("li.item", [
            m("input", {type: "checkbox", checked: item.done}),
            m("h2.item-title", item.title),
            item.deadline ? m("h3.item-deadline", item.deadline.toString()) : undefined
        ]);
    }
};

export default Item;
