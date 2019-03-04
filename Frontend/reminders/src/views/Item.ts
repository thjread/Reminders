import m from "mithril";
import { TodoContext } from "./TodoPage";
import {store, getTodo} from "../models/store";
import {deleteTodo, toggleDone} from "../models/actions";
import {edit} from "../models/ui";;
import {formatDateTime} from "../utils";

interface Attrs {
    id: string;
    selectCallback: (id: string) => void;
    selected: boolean;
    context: TodoContext;
    animate_enter: boolean;
}

const Item: m.Component<Attrs> = {
    oncreate: function(vnode: any) {
        if (vnode.attrs.animate_enter) {
            vnode.dom.classList.add("item-enter");
            vnode.dom.addEventListener("animationend", () => vnode.dom.classList.remove("item-enter"));
        }
    },

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

        let displayTime = null;
        switch (vnode.attrs.context) {
            case TodoContext.Normal: {
                if (!item.hide_until_done) {
                    displayTime = item.deadline;
                }
                break;
            }
            case TodoContext.Completed: {
                displayTime = item.done_time;
                break;
            }
            case TodoContext.Upcoming: {
                displayTime = item.deadline;
                break;
            }
        }

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
                         displayTime ? m("h3.item-deadline", formatDateTime(displayTime)) : undefined
                     ]),
            m("div.item-options", [
                  m("button.pill-button.on-secondary.option-button", {tabindex: selected ? 0 : -1, onclick: () => {
                      toggleSelect(id);
                      edit(id);
                  }}, "Edit"),
                  m("button.pill-button.on-secondary.option-button", {tabindex: selected ? 0 : -1, onclick: () => {
                      toggleSelect(id);
                      store.dispatch(deleteTodo(id));
                  }}, "Delete")
            ])
        ]);
    }
};

export default Item;
