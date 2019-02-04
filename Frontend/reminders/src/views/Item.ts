import m from "mithril";
import moment from "moment";
import {store, getTodo, getCurrentDate} from "../models/store";
import {toggleDone} from "../models/actions";

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
            item.deadline ? m("h3.item-deadline", moment(item.deadline).calendar(getCurrentDate())) : undefined
        ]);
    }
};

export default Item;
