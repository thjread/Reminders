import m from "mithril";
import {store, getTodo} from "../models/store";
import {deleteTodo, toggleDone} from "../models/actions";
import {edit} from "../models/ui";;
import {formatDateTime} from "../utils";

interface Attrs {
    id: string;
    selectCallback: (id: string) => void;
    selected: boolean;
}

const Item: m.Component<Attrs> = {
    view: function(vnode) {
        const id = vnode.attrs.id;
        const item = getTodo(id);
        const toggleSelect = vnode.attrs.selectCallback;
        const selected = vnode.attrs.selected;

        return m("li.item", [
                     m("div.item-main", { onclick: () => toggleSelect(id) }, [
                         m("input[type=checkbox]",
                           {checked: item.done,
                            id: id,
                            oninput: (e: any) => store.dispatch(toggleDone(id, e.target.checked))}),
                         m("label.css-check", {for: id}),
                         m("h2.item-title", item.title),
                         m("h2.item-deadline", item.deadline ? m("h3.item-deadline", formatDateTime(item.deadline)) : undefined)
                     ]),
                     selected ?
                         m("div.item-options", [
                             m("button.pill-button.on-primary.narrow-button", {onclick: () => edit(id)}, "Edit"),
                             m("button.pill-button.on-primary.narrow-button", {onclick: () => store.dispatch(deleteTodo(id))}, "Delete")
                         ]) : undefined
                 ]);
    }
};

export default Item;
