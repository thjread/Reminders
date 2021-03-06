import m from "mithril";
import { MENU_SWIPE_OUT_MARGIN } from "./TodoPage";
import { store, getTodo } from "../models/store";
import { deleteTodo, toggleDone, toggleHighlight } from "../models/actions";
import { formatDateTime, dateColorClass } from "../utils";
import { serverUpdate } from "../models/update";

const MENU_SWIPE_OUT_EXTRA_MARGIN = 10;
const SWIPE_DONE_DISTANCE = 95;
const SWIPE_SELECTED_DONE_DISTANCE = 130;
const SWIPE_DONE_Y_MARGIN = 0;
const SWIPE_SELECTED_Y_GUTTER = 85;
const LONG_PRESS_DELAY = 600;
const LONG_PRESS_DIST = 10;
const LONG_PRESS_VIBRATE = 20;

interface Attrs {
    id: string;
    selectCallback: (id: string) => void;
    selected: boolean;
    animateEnter: boolean;
}

const Item = (): m.Component<Attrs> => {
    let swipingRight = false;
    let swipingRightTime = 0;
    let holding = false;
    let holdingTimeout: undefined | number;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let selected = false;
    let title = "";
    let katexedTitle: null | string;
    let mouseover = false;

    function speedBonus(speed: number) {
        return Math.max(0, Math.min(1, speed-1));
    }

    function slowPenalty(time: number) {
        return Math.max(-1, Math.min(0, -(time-300.0)/700.0));
    }

    function touchStart(e: TouchEvent, highlightCallback: () => void) {
        if (e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            startX = touch.pageX;
            startY = touch.screenY;
            startTime = e.timeStamp;

            holding = true;
            holdingTimeout = window.setTimeout(() => {
                if (holding) {
                    holding = false;
                    highlightCallback();
                }
            }, LONG_PRESS_DELAY);

            if (startX > MENU_SWIPE_OUT_MARGIN + MENU_SWIPE_OUT_EXTRA_MARGIN) {
                swipingRight = true;
                swipingRightTime = e.timeStamp;
            } else {
                swipingRight = false;
            }
        }
    }

    function touchHighlight(e: TouchEvent, highlightCallback: () => void) {
        if (holding && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const diffX = (touch.pageX - startX);
            const diffY = (touch.screenY - startY);
            const dist = diffX*diffX + diffY*diffY;
            if (dist > LONG_PRESS_DIST*LONG_PRESS_DIST) {
                holding = false;
                if (holdingTimeout) {
                    window.clearTimeout(holdingTimeout);
                }
            } else if (e.timeStamp - startTime > LONG_PRESS_DELAY) {
                holding = false;
                if (holdingTimeout) {
                    window.clearTimeout(holdingTimeout);
                }
                highlightCallback();
            }
        }
    }

    function touchMove(e: TouchEvent, elem: Element, doneCallback: () => void, highlightCallback: () => void) {
        touchHighlight(e, highlightCallback);
        if (e.changedTouches.length === 1 && swipingRight) {
            const touch = e.changedTouches[0];
            const diff = touch.pageX - startX;

            const rect = elem.getBoundingClientRect();
            if (touch.clientY > rect.top - SWIPE_DONE_Y_MARGIN &&
                touch.clientY < rect.bottom + SWIPE_DONE_Y_MARGIN &&
                !(selected && Math.abs(startY - touch.pageY) > SWIPE_SELECTED_Y_GUTTER)) {
                const time = e.timeStamp - swipingRightTime;
                const speed = diff / time;
                const multiplier = 1 + speedBonus(speed) + slowPenalty(time);
                const selectedMultiplier = 1 + slowPenalty(time);
                // if selected, don't allow speed bonus, and have higher threshold,
                // to prevent accidental marking as done while scrolling
                if ((!selected && multiplier*diff > SWIPE_DONE_DISTANCE) ||
                    (selected && selectedMultiplier*diff > SWIPE_SELECTED_DONE_DISTANCE)) {
                    swipingRight = false;
                    doneCallback();
                }
            } else {
                swipingRight = false;
            }
        }
    }

    function touchEnd(e: TouchEvent, highlightCallback: () => void) {
        touchHighlight(e, highlightCallback);
        swipingRight = false;
        holding = false;
        if (holdingTimeout) {
            window.clearTimeout(holdingTimeout);
        }
    }

    function katexUpdate(vnode: m.Vnode<Attrs>) {
        if (katexedTitle !== title) {
            const elem = document.getElementById(vnode.attrs.id + "-item-title");
            if (elem) {
                if (title.includes("$$") || title.includes("\\[")) {
                    import(/* webpackChunkName: "katex" */ "../katex")
                        .then(({ renderMath }) => {
                            renderMath(elem, title);
                        }).catch((e) => "Error " + e + " while loading Katex library");
                } else {
                    elem.textContent = title;
                }
            }
            katexedTitle = title;
        }
    }

    return {
        oncreate(vnode) {
            if (vnode.attrs.animateEnter) {
                vnode.dom.classList.add("item-enter");
                vnode.dom.addEventListener("animationend", () => vnode.dom.classList.remove("item-enter"));
            }

            const highlightCallback = () => {
                const id = vnode.attrs.id;
                const todo = getTodo(id);
                if (todo && !todo.done) {
                    if ("vibrate" in navigator) {
                        navigator.vibrate([LONG_PRESS_VIBRATE]);
                    }
                    store.dispatch(toggleHighlight(id, !todo.highlight));
                    m.redraw();
                }
            };
            vnode.dom.addEventListener("touchstart",
                                       (e: TouchEvent) => touchStart(e, highlightCallback),
                                       { passive: true });
            vnode.dom.addEventListener("touchmove", (e: TouchEvent) => touchMove(e, vnode.dom, () => {
                const id = vnode.attrs.id;
                const todo = getTodo(id);
                if (todo && !todo.done) {
                    store.dispatch(toggleDone(id, true));
                    m.redraw();
                }
            }, highlightCallback), { passive: true });
            vnode.dom.addEventListener("touchend",
                                       (e: TouchEvent) => touchEnd(e, highlightCallback),
                                       { passive: true });
            katexUpdate(vnode);
            mouseover = false;
        },

        onupdate: katexUpdate,

        onbeforeremove(vnode: any) {
            const todo = getTodo(vnode.attrs.id);
            if (todo && todo.done) {
                vnode.dom.classList.add("done-item-exit");
            } else {
                vnode.dom.classList.add("item-exit");
            }
            return new Promise((resolve: any) => {
                vnode.dom.addEventListener("animationend", resolve);
            });
        },

        view(vnode) {
            const id = vnode.attrs.id;
            const item = getTodo(id);
            if (!item) {
                console.warn(`Todo ${id} does not exist`);
                return;
            }
            title = item.title;
            const toggleSelect = vnode.attrs.selectCallback;
            selected = vnode.attrs.selected;

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

            const toggleAndScrollUp = () => {
                if (selected) {
                    const itemTitle = document.getElementById(id+"-item-title");
                    if (itemTitle) {
                        itemTitle.scrollTop = 0;
                    }
                }
                toggleSelect(id);
            };

            const liClasses = [];
            if (selected) {
                liClasses.push("selected");
            }
            if (mouseover) {
                liClasses.push("mouseover");
            }
            if (!item.done && item.highlight) {
                liClasses.push("highlight");
            }

            let onpointerover;
            let onpointerout;
            let onmouseover;
            let onmouseout;
            // Safari (12) doesn't support PointerEvent yet
            if ((window as any).PointerEvent) {
                onpointerover =  (event: PointerEvent) => {
                    if (event.pointerType === "mouse") {
                        mouseover = true;
                    }
                };
                onpointerout = () => {
                    mouseover = false;
                };
            } else {
                onmouseover = () => {
                    mouseover = true;
                };
                onmouseout = () => {
                    mouseover = false;
                };
            }

            return m("li.item", {
                class: liClasses.join(" "),
                onpointerover,
                onpointerout,
                onmouseover,
                onmouseout,
            }, [
                m("div.item-main", {
                    onclick: toggleAndScrollUp,
                }, [
                    m("div.item-first", [
                        m("input[type=checkbox]",
                          {
                            checked: item.done,
                            id: id+"-check",
                            onclick: (e: any) => {
                                store.dispatch(toggleDone(id, e.target.checked));
                                serverUpdate();
                            },
                            "aria-labelledby": id+"-item-title",
                        }),
                        m("label.css-check", { for: id+"-check" }),
                        m("h2.item-title", { id: id+"-item-title" }, title),
                    ]),
                    displayTime ? m("h3.item-deadline",
                                    { class: displayColorClass },
                                    formatDateTime(displayTime),
                                   ) : undefined,
                ]),
                item.done ? undefined : m("div.item-highlight", [
                    m("button.pill-button.option-button", {
                        tabindex: mouseover ? 0 : -1,
                        onclick: () => {
                            store.dispatch(toggleHighlight(id, !item.highlight));
                            mouseover = false;
                        },
                    }, item.highlight ? "Unpin" : "Pin"),
                ]),
                m("div.item-options", [
                    m("button.pill-button.on-secondary.option-button", { tabindex: selected ? 0 : -1, onclick: () => {
                        m.route.set("/", { c: m.route.param("c"), e: id});
                    } }, "Edit"),
                    m("button.pill-button.on-secondary.option-button", { tabindex: selected ? 0 : -1, onclick: () => {
                        store.dispatch(deleteTodo(id));
                        serverUpdate();
                    }}, "Delete"),
                ]),
            ]);
        },
    };
};

export default Item;
