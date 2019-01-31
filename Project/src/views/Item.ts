import m from "mithril";
import moment from "moment";
import {getTodo, getCurrentDate} from "../models/Store";

// TODO optimise moment with webpack

interface Attrs {
    id: string;
}

const Item: m.Component<Attrs> = {
    view: function(vnode) {
        const item = getTodo(vnode.attrs.id);

        return m("li.item", [
            m("input", {type: "checkbox", checked: item.done}),
            m("h2.item-title", item.title),
            item.deadline ? m("h3.item-deadline", moment(item.deadline).calendar(getCurrentDate())) : undefined
        ]);
    }
};

export default Item;
