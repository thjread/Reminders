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
    onbeforeremove: function(vnode: any) {
        vnode.dom.classList.add("item-exit");
        return new Promise(function(resolve: any) {
            vnode.dom.addEventListener("animationend", resolve);
        })
    },

    view: function(vnode) {
        const id = vnode.attrs.id;
        const item = getTodo(id);
        const toggleSelect = vnode.attrs.selectCallback;
        const selected = vnode.attrs.selected;

        return m("li.item", {class: selected ? "selected" : undefined}, [
                     m("div.item-main", { onclick: () => toggleSelect(id) }, [
                         m("div.item-first", [
                             m("input[type=checkbox]",
                               {checked: item.done,
                                id: id,
                                oninput: (e: any) => store.dispatch(toggleDone(id, e.target.checked))}),
                             m("label.css-check", {for: id}),
                             m("h2.item-title", item.title),
                         ]),
                         (item.deadline && !item.hide_until_done) ? m("h3.item-deadline", formatDateTime(item.deadline)) : undefined
                     ]),
            m("div.item-options", [
                  m("button.pill-button.on-primary.option-button", {tabindex: selected ? 0 : -1, onclick: () => {
                      toggleSelect(id);
                      edit(id);
                  }}, "Edit"),
                  m("button.pill-button.on-primary.option-button", {tabindex: selected ? 0 : -1, onclick: () => {
                      toggleSelect(id);
                      store.dispatch(deleteTodo(id));
                  }}, "Delete")
            ])
        ]);
    }
};

export default Item;
