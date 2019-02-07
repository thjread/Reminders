import m from "mithril";
import {store, getTodo} from "../models/store";
import {toggleDone} from "../models/actions";
import {formatDateTime} from "../utils";

// TODO optimise moment with webpack or replace with own code

interface Attrs {
    id: string;
}

const Item: m.Component<Attrs> = {
    view: function(vnode) {
        const id = vnode.attrs.id;
        const item = getTodo(id);

        return m("li.item", [
            m("input[type=checkbox]",
              {checked: item.done,
               oninput: (e: any) => store.dispatch(toggleDone(id, e.target.checked))}),
            m("h2.item-title", item.title),
            item.deadline ? m("h3.item-deadline", formatDateTime(item.deadline)) : undefined
        ]);
    }
};

export default Item;
