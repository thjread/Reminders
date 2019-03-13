import m from "mithril";
import { MENU_SWIPE_OUT_MARGIN } from "./TodoPage";
import { store, getTodo } from "../models/store";
import { deleteTodo, toggleDone } from "../models/actions";
import { formatDateTime, dateColorClass } from "../utils";
import { serverUpdate } from "../models/update";

const MENU_SWIPE_OUT_EXTRA_MARGIN = 10;
const SWIPE_DONE_DISTANCE = 95;
const SWIPE_DONE_Y_MARGIN = 0;

interface Attrs {
    id: string;
    selectCallback: (id: string) => void;
    selected: boolean;
    animateEnter: boolean;
}

const Item = (): m.Component<Attrs> => {
    let swipingRight = false;
    let swipingRightTime = 0;
    let startX = 0;

    function speedBonus(speed: number) {
        return Math.max(0, Math.min(1, speed-1));
    }

    function slowPenalty(time: number) {
        return Math.max(-1, Math.min(0, -(time-300.0)/700.0));
    }

    function touchStart(e: TouchEvent) {
        if (e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            startX = touch.pageX;

            if (startX > MENU_SWIPE_OUT_MARGIN + MENU_SWIPE_OUT_EXTRA_MARGIN) {
                swipingRight = true;
                swipingRightTime = e.timeStamp;
            } else {
                swipingRight = false;
            }
        }
    }

    function touchMove(e: TouchEvent, elem: Element, callback: () => void) {
        if (swipingRight && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const diff = touch.pageX - startX;

            const rect = elem.getBoundingClientRect();
            if (touch.clientY > rect.top - SWIPE_DONE_Y_MARGIN && touch.clientY < rect.bottom + SWIPE_DONE_Y_MARGIN) {
                const time = e.timeStamp - swipingRightTime;
                const speed = diff / time;
                const multiplier = 1 + speedBonus(speed) + slowPenalty(time);
                if (multiplier*diff > SWIPE_DONE_DISTANCE) {
                    swipingRight = false;
                    callback();
                }
            } else {
                swipingRight = false;
            }
        }
    }

    function touchEnd() {
        swipingRight = false;
    }

    return {
        oncreate(vnode) {
            if (vnode.attrs.animateEnter) {
                vnode.dom.classList.add("item-enter");
                vnode.dom.addEventListener("animationend", () => vnode.dom.classList.remove("item-enter"));
            }

            vnode.dom.addEventListener("touchstart", touchStart, { passive: true });
            vnode.dom.addEventListener("touchmove", (e) => touchMove(e as TouchEvent, vnode.dom, () => {
                const id = vnode.attrs.id;
                const todo = getTodo(id);
                if (!todo.done) {
                    store.dispatch(toggleDone(id, true));
                    m.redraw();
                }
            }), { passive: true });
            vnode.dom.addEventListener("touchend", touchEnd, { passive: true });
        },

        onbeforeremove(vnode: any) {
            vnode.dom.classList.add("item-exit");
            return new Promise((resolve: any) => {
                vnode.dom.addEventListener("animationend", resolve);
            });
        },

        view(vnode) {
            const id = vnode.attrs.id;
            const item = getTodo(id);
            const toggleSelect = vnode.attrs.selectCallback;
            const selected = vnode.attrs.selected;

            let displayTime = null;
            let displayColorClass;
            switch (m.route.param("c")) {
                case "completed": {
                    displayTime = item.done_time;
                    break;
                }
                case "upcoming": {
                    displayTime = item.deadline;
                    if (displayTime) {
                        displayColorClass = dateColorClass(displayTime);
                    }
                    break;
                }
                default: {
                    if (!item.hide_until_done) {
                        displayTime = item.deadline;
                        if (displayTime) {
                            displayColorClass = dateColorClass(displayTime);
                        }
                    }
                    break;
                }
            }

            return m("li.item", { class: selected ? "selected" : undefined }, [
                m("div.item-main", {
                    onclick: () => {
                        if (selected) {
                            const itemTitle = document.getElementById(id+"-item-title");
                            if (itemTitle) {
                                itemTitle.scrollTop = 0;
                            }
                        }
                        toggleSelect(id);
                    },
                }, [
                    m("div.item-first", [
                        m("input[type=checkbox]",
                          {
                            checked: item.done,
                            id: id+"-check",
                            oninput: (e: any) => {
                                store.dispatch(toggleDone(id, e.target.checked));
                                serverUpdate();
                            },
                        }),
                        m("label.css-check", { for: id+"-check" }),
                        m("h2.item-title", { id: id+"-item-title" }, item.title),
                    ]),
                    displayTime ? m("h3.item-deadline",
                                    { class: displayColorClass },
                                    formatDateTime(displayTime),
                                   ) : undefined,
                ]),
                m("div.item-options", [
                    m("button.pill-button.on-secondary.option-button", { tabindex: selected ? 0 : -1, onclick: () => {
                        toggleSelect(id);
                        m.route.set("/", { c: m.route.param("c"), e: id});
                    }}, "Edit"),
                    m("button.pill-button.on-secondary.option-button", { tabindex: selected ? 0 : -1, onclick: () => {
                        toggleSelect(id);
                        store.dispatch(deleteTodo(id));
                        serverUpdate();
                    }}, "Delete"),
                ]),
            ]);
        },
    };
};

export default Item;
