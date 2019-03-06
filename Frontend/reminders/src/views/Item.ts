import m from "mithril";
import { TodoContext } from "./TodoPage";
import {store, getTodo} from "../models/store";
import {deleteTodo, toggleDone} from "../models/actions";
import {edit} from "../models/ui";;
import {formatDateTime} from "../utils";

const SWIPE_DONE_DISTANCE = 95;
const SWIPE_DONE_Y_MARGIN = 0;

interface Attrs {
    id: string;
    selectCallback: (id: string) => void;
    selected: boolean;
    context: TodoContext;
    animate_enter: boolean;
}

const Item = function (): m.Component<Attrs> {
    let swipingRight = false;
    let swipingRightTime = 0;
    let startX = 0;

    function speedBonus(speed: number) {
        return Math.max(0, Math.min(1, speed-1));
    }

    function slowPenalty(time: number) {
        return Math.max(-1, Math.min(0, -(time-300.0)/700.0))
    }

    function touchStart(e: TouchEvent) {
        if (e.changedTouches.length == 1) {
            const touch = e.changedTouches[0];
            startX = touch.pageX;
            swipingRight = true;
            swipingRightTime = e.timeStamp;
        }
    }

    function touchMove(e: TouchEvent, elem: Element, callback: () => void) {
        if (swipingRight && e.changedTouches.length == 1) {
            const touch = e.changedTouches[0];
            const diff = touch.pageX - startX;

            const rect = elem.getBoundingClientRect();
            if (touch.clientY > rect.top - SWIPE_DONE_Y_MARGIN && touch.clientY < rect.bottom + SWIPE_DONE_Y_MARGIN) {
                const time = e.timeStamp - swipingRightTime;
                const speed= diff / time;
                const multiplier= 1 + speedBonus(speed) + slowPenalty(time);
                if (multiplier*diff > SWIPE_DONE_DISTANCE) {
                    swipingRight = false;
                    callback();
                }
            } else {
                swipingRight = false;
            }
        }
    }

    function touchEnd(e: TouchEvent) {
        swipingRight = false;
    }

    return {
        oncreate: function(vnode) {
            if (vnode.attrs.animate_enter) {
                vnode.dom.classList.add("item-enter");
                vnode.dom.addEventListener("animationend", () => vnode.dom.classList.remove("item-enter"));
            }

            vnode.dom.addEventListener("touchstart", touchStart, false);
            vnode.dom.addEventListener("touchmove", (e) => touchMove(e as TouchEvent, vnode.dom, () => {
                const id = vnode.attrs.id;
                const todo = getTodo(id);
                if (!todo.done) {
                    store.dispatch(toggleDone(id, true))
                }
            }), false);
            vnode.dom.addEventListener("touchend", touchEnd, false);
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
                m("div.item-main", {
                    onclick: () => {
                        if (selected) {
                            const item_title = document.getElementById(id+"-item-title");
                            if (item_title) {
                                item_title.scrollTop = 0;
                            }
                        }
                        toggleSelect(id);
                    }
                }, [
                    m("div.item-first", [
                        m("input[type=checkbox]",
                          {checked: item.done,
                           id: id+"-check",
                           oninput: (e: any) => store.dispatch(toggleDone(id, e.target.checked))}),
                        m("label.css-check", {for: id+"-check"}),
                        m("h2.item-title", {id: id+"-item-title"}, item.title),
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
    }
};

export default Item;
