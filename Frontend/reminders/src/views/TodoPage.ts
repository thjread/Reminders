import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import {store, dueTodos, deadlineTodos, otherTodos, completedTodos, upcomingTodos, pendingUndo} from "../models/store";
import {addShortcut, removeShortcut} from "../models/actions";
import {logout} from "../models/auth";
import {undo, dismissUndo, create} from "../models/ui";
import { CLOUD_SVG, MENU_SVG } from "./Icons";

const UNDO_SHOW_TIME = 10*1000;// 10 seconds
const SYNC_DISPLAY_TIME = 10*1000;// 10 seconds
const MENU_SWIPE_OUT_MARGIN = 50;
const MENU_SWIPE_OUT_DISTANCE = 60;
const MENU_SWIPE_IN_EXTRA_MARGIN = 50;
const MENU_SWIPE_IN_DISTANCE = 60;

export enum TodoContext {
    Normal,
    Upcoming,
    Completed
}

interface Attrs {
    context: TodoContext;
}

const TodoPage = function (): m.Component<Attrs> {
    let showMenu = false;
    let desktopLayout = false;
    const desktopQuery = window.matchMedia("only screen and (min-width: 700px)");// move this to global state if we want to use it anywhere else

    let oldContext: null | TodoContext = null;

    function doShowMenu(show: boolean) {
        if (show) {
            showMenu = true;
            if (!desktopLayout) {
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        } else {
            showMenu = false;
        }
    }

    function desktopQueryHandle (q: MediaQueryListEvent | MediaQueryList) {
        if (q.matches) {
            desktopLayout = true;
            doShowMenu(true);
        } else {
            desktopLayout = false;
            doShowMenu(false);
        }
        m.redraw();
    }

    function getREM () {
        const s = getComputedStyle(document.documentElement).fontSize;
        return s ? parseFloat(s) : 16;
    }

    let swipingMenuOut = false;
    let swipingMenuOutTime = 0;
    let swipingMenuIn = false;
    let swipingMenuInTime = 0;
    let startX = 0;

    function speedBonus(speed: number) {
        return Math.max(0, Math.min(1, speed-1));
    }

    function slowPenalty(time: number) {
        return Math.max(-1, Math.min(0, -(time-300.0)/700.0))
    }


    function menuTouchStart(e: TouchEvent) {
        if (e.changedTouches.length == 1) {
            const touch = e.changedTouches[0];
            startX = touch.pageX;
            /* Only allow swipes starting at the left margin to open the menu */
            if (touch.pageX < MENU_SWIPE_OUT_MARGIN) {
                swipingMenuOut = true;
                swipingMenuOutTime = e.timeStamp;
            }
            /* In mobile, happy with any swipes, but on desktop only want swipes starting
               on the menu to close it */
            if (!desktopLayout || touch.pageX < 14*getREM() + MENU_SWIPE_IN_EXTRA_MARGIN) {
                swipingMenuIn = true;
                swipingMenuInTime = e.timeStamp;
            }
        }
    }

    function menuTouchMove(e: TouchEvent) {
        if (e.changedTouches.length == 1) {
            const touch = e.changedTouches[0];
            const diff = touch.pageX - startX;

            const timeOut = e.timeStamp - swipingMenuOutTime;
            const speedOut = diff / timeOut;
            const multiplierOut = 1 + speedBonus(speedOut) + slowPenalty(timeOut);
            if (swipingMenuOut && multiplierOut*diff > MENU_SWIPE_OUT_DISTANCE) {
                swipingMenuOut = false;
                doShowMenu(true);
                m.redraw();
            }

            const timeIn = e.timeStamp - swipingMenuInTime;
            const speedIn = -diff / timeIn;
            const multiplierIn = 1 + speedBonus(speedIn) + slowPenalty(timeIn);
            if (swipingMenuIn && multiplierIn*diff < -MENU_SWIPE_IN_DISTANCE) {
                doShowMenu(false);
                m.redraw();
            }
        }
    }

    function menuTouchEnd(e: TouchEvent) {
        swipingMenuOut = false;
        swipingMenuIn = false;
    }

    return {
        oninit: function(vnode) {
            store.dispatch(addShortcut("Enter 000", {
                callback: create,
                anywhere: false,
                preventDefault: true
            }));
            desktopQueryHandle(desktopQuery);
            desktopQuery.addListener(desktopQueryHandle);

            window.addEventListener("touchstart", menuTouchStart, false);
            window.addEventListener("touchmove", menuTouchMove, false);
            window.addEventListener("touchend",menuTouchEnd, false);

            oldContext = null;// ensure contextChanged=true on first draw
        },

        onremove: function() {
            store.dispatch(removeShortcut("Enter 000"));
            desktopQuery.removeListener(desktopQueryHandle);
            window.removeEventListener("touchstart", menuTouchStart, false);
            window.removeEventListener("touchmove", menuTouchMove, false);
            window.removeEventListener("touchend", menuTouchEnd, false);
        },

        view: function(vnode) {
            const undoAction = pendingUndo();
            let showUndo = false;
            if (undoAction && (Date.now() - undoAction.time.getTime()) < UNDO_SHOW_TIME) {
                showUndo = true;
            }
            let showSynced = false;
            const state = store.getState();
            if (state.syncActions.length === 0 && state.onlineAsOf && Date.now() - state.onlineAsOf.getTime() < SYNC_DISPLAY_TIME && navigator.onLine !== false) {
                showSynced = true;
            }

            // only animate todo section enter if not just switched context
            const contextChanged = vnode.attrs.context !== oldContext;
            oldContext = vnode.attrs.context;
            let todoSections: (m.Vnode | undefined)[] = [];
            function section(ids: string[], title: string) {
                return ids.length > 0 ? m(TodoSection, {title: title, key: title, animate_enter: !contextChanged}, m(TodoList, {todoIds: ids, context: vnode.attrs.context})) : undefined;
            }
            switch (vnode.attrs.context) {
                case TodoContext.Normal: {
                    const due = dueTodos();
                    const deadline = deadlineTodos();
                    const other = otherTodos();
                    todoSections = [
                        section(due, "DUE"),
                        section(other, "TASKS"),
                        section(deadline, "DEADLINES")
                    ];
                    break;
                }
                case TodoContext.Upcoming: {
                    const upcoming = upcomingTodos();
                    todoSections = [
                        section(upcoming, "UPCOMING")
                    ];
                    break;
                }
                case TodoContext.Completed: {
                    const completed = completedTodos();
                    todoSections = [
                        section(completed, "COMPLETED")
                    ];
                    break;
                }
            }

            const header =
                m("header.header", [
                    m("div.header-first", [
                        m("button.menu-icon", { onclick: () => {doShowMenu(!showMenu);}}, m.trust(MENU_SVG)),
                    ]),
                    m("div.header-last", [
                        m("div.cloud", { class: showSynced ? undefined : "cloud-hidden" }, m.trust(CLOUD_SVG))
                    ])
                ]);

            const loginDetails = store.getState().loginDetails;
            let username = "";
            if (loginDetails) {
                username = loginDetails.username;
            }
            const menu =
                m("div.menu-container", {class: showMenu ? "menu-show" : undefined}, [
                    m("div.menu-shadow", {onclick: () => {doShowMenu(false);}}),
                    m("div.menu-spacer"),
                    m("nav.menu", [
                        m("ul.menu-list", [
                            ["Reminders", "", vnode.attrs.context === TodoContext.Normal],
                            ["Upcoming", "upcoming", vnode.attrs.context === TodoContext.Upcoming],
                            ["Completed", "completed", vnode.attrs.context === TodoContext.Completed]
                        ].map(([title, path, selected]) => {
                            return m("li", m(`a[href=/${path}].main-nav-item`, {class: selected ? "selected" : undefined, oncreate: m.route.link, onclick: () => {doShowMenu(desktopLayout);}}, title));
                        })),
                        m("h4.menu-username", [
                            "Logged in as ", m("span.username", username)
                        ]),
                        m("div.menu-logout",
                          m("button.text-button.on-background", {onclick: logout}, "Log out"))
                    ])
                ]);

            return [
                header,
                m("div.page-container", [
                    menu,
                    m("main.todo-container", todoSections)
                ]),
                m("div.undo", {class: showUndo ? undefined : "undo-hidden" }, [
                    m("button.undo-button", {onclick: undo, tabindex: showUndo ? 0 : -1}, "Undo"),
                    m("button.dismiss-button", {onclick: dismissUndo, tabindex: showUndo ? 0 : -1}, "✕")]),
                m("button.fab", {onclick: create}, "+")
            ]}
    }
}

export default TodoPage;
