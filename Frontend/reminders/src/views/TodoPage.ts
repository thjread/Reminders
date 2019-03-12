import m from "mithril";
import TodoSection from "./TodoSection";
import TodoList from "./TodoList";

import { store, dueTodos, deadlineTodos, otherTodos, completedTodos,
         upcomingTodos, pendingUndo } from "../models/store";
import { addShortcut, createShortcutContext, popShortcutContext } from "../models/actions";
import { logout } from "../models/auth";
import { undo, dismissUndo } from "../models/ui";
import { CLOUD_SVG, MENU_SVG } from "./Icons";

const UNDO_SHOW_TIME = 10*1000; // 10 seconds
const SYNC_DISPLAY_TIME = 10*1000; // 10 seconds
export const MENU_SWIPE_OUT_MARGIN = 50;
const MENU_SWIPE_OUT_DISTANCE = 60;
const MENU_SWIPE_IN_EXTRA_MARGIN = 50;
const MENU_SWIPE_IN_DISTANCE = 60;

interface Attrs {
    modal: m.Vnode | undefined;
}

const TodoPage = (): m.Component<Attrs> => {
    let showMenu = false;
    let desktopLayout = false;
    const desktopQuery = window.matchMedia("only screen and (min-width: 900px)");
    // move this to global state if we want to use it anywhere else

    let oldContext: null | string = null;

    function contextClass(context: string) {
        switch (context) {
            case "upcoming":
                return "upcoming";
            case "completed":
                return "completed";
            default:
                return "normal";
        }
    }

    function doShowMenu(show: boolean) {
        if (show) {
            showMenu = true;
            if (!desktopLayout) {
                window.scrollTo({ top: 0, behavior: "smooth"});
            }
        } else {
            showMenu = false;
        }
    }

    function desktopQueryHandle(q: MediaQueryListEvent | MediaQueryList) {
        if (q.matches) {
            desktopLayout = true;
            doShowMenu(true);
        } else {
            desktopLayout = false;
            doShowMenu(false);
        }
        m.redraw();
    }

    function getREM() {
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
        return Math.max(-1, Math.min(0, -(time-300.0)/700.0));
    }

    function menuTouchStart(e: TouchEvent) {
        if (e.changedTouches.length === 1) {
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
        if (e.changedTouches.length === 1) {
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

    function menuTouchEnd() {
        swipingMenuOut = false;
        swipingMenuIn = false;
    }

    return {
        oninit() {
            store.dispatch(createShortcutContext());
            store.dispatch(addShortcut("Enter 000", {
                callback: () => {
                    m.route.set("/", { c: m.route.param("c"), e: ""});
                },
                anywhere: false,
                preventDefault: true,
            }));
            desktopQueryHandle(desktopQuery);
            desktopQuery.addListener(desktopQueryHandle);

            window.addEventListener("touchstart", menuTouchStart, false);
            window.addEventListener("touchmove", menuTouchMove, false);
            window.addEventListener("touchend", menuTouchEnd, false);

            oldContext = null; // ensure contextChanged=true on first draw
        },

        onremove() {
            store.dispatch(popShortcutContext());
            desktopQuery.removeListener(desktopQueryHandle);
            window.removeEventListener("touchstart", menuTouchStart, false);
            window.removeEventListener("touchmove", menuTouchMove, false);
            window.removeEventListener("touchend", menuTouchEnd, false);
        },

        view(vnode) {
            const undoAction = pendingUndo();
            let showUndo = false;
            if (undoAction && (Date.now() - undoAction.time.getTime()) < UNDO_SHOW_TIME) {
                showUndo = true;
            }
            let showSynced = false;
            const state = store.getState();
            if (state.syncActions.length === 0 &&
                state.onlineAsOf &&
                Date.now() - state.onlineAsOf.getTime() < SYNC_DISPLAY_TIME &&
                navigator.onLine !== false) {
                showSynced = true;
            }

            // only animate todo section enter if not just switched context
            const context = m.route.param("c");
            const contextChanged = context !== oldContext;
            oldContext = context;
            let todoSections: Array<m.Vnode | undefined> = [];
            function section(ids: string[], title: string) {
                return ids.length > 0 ?
                    m(TodoSection, { title, key: title, animate_enter: !contextChanged}, m(TodoList, { todoIds: ids})) :
                    undefined;
            }
            switch (context) {
                case "upcoming": {
                    const upcoming = upcomingTodos();
                    todoSections = [
                        section(upcoming, "UPCOMING"),
                    ];
                    break;
                }
                case "completed": {
                    const completed = completedTodos();
                    todoSections = [
                        section(completed, "COMPLETED"),
                    ];
                    break;
                }
                default: {
                    const due = dueTodos();
                    const deadline = deadlineTodos();
                    const other = otherTodos();
                    todoSections = [
                        section(due, "DUE"),
                        section(other, "TASKS"),
                        section(deadline, "DEADLINES"),
                    ];
                    break;
                }
            }

            const modal = vnode.attrs.modal;

            const header =
                m("header.header", { class: contextClass(context)}, [
                    m("div.header-first", [
                        m("button.menu-icon", {
                            "aria-label": "Menu",
                            onclick: () => { doShowMenu(!showMenu); },
                        }, m.trust(MENU_SVG)),
                    ]),
                    m("div.header-last", [
                        m("div.cloud", { class: showSynced ? undefined : "cloud-hidden" }, m.trust(CLOUD_SVG)),
                    ]),
                ]);

            const loginDetails = store.getState().loginDetails;
            let username = "";
            if (loginDetails) {
                username = loginDetails.username;
            }
            const menu =
                m("div.menu-container", { class: showMenu ? "menu-show" : undefined}, [
                    m("div.menu-shadow", { onclick: () => { doShowMenu(false); }}),
                    m("div.menu-spacer"),
                    m("nav.menu", [
                        m("ul.menu-list", [
                            ["Reminders", "", context !== "upcoming" && context !== "completed"],
                            ["Upcoming", "upcoming", context === "upcoming"],
                            ["Completed", "completed", context === "completed"],
                        ].map(([title, path, selected]) => {
                            return m("li", m(`a[href=/?c=${path}].main-nav-item`, {
                                class: selected ? "selected" : undefined,
                                oncreate: m.route.link,
                                onclick: () => { doShowMenu(desktopLayout); },
                            }, title));
                        })),
                        m("h4.menu-username", [
                            "Logged in as ", m("span.username", username),
                        ]),
                        m("div.menu-logout",
                          m("button.text-button.on-background", { onclick: logout}, "Log out")),
                    ]),
                ]);

            return [
                header,
                m("div.page-container", { class: contextClass(context)}, [
                    menu,
                    m("main.todo-container", todoSections),
                ]),
                m("div.undo", { class: showUndo ? undefined : "undo-hidden" }, [
                    m("button.undo-button#undo-button", { onclick: () => {
                        const elem = document.getElementById("undo-button");
                        if (elem) {
                            elem.blur();
                        }
                        undo();
                    }, tabindex: showUndo ? 0 : -1}, "Undo"),
                    m("button.dismiss-button#dismiss-button", { onclick: () => {
                        const elem = document.getElementById("dismiss-button");
                        if (elem) {
                            elem.blur();
                        }
                        dismissUndo();
                    }, tabindex: showUndo ? 0 : -1}, "✕")]),
                modal ? undefined : m("button.fab", { onclick: () => {
                    m.route.set("/", { c: m.route.param("c"), e: ""});
                }}, "+"),
                modal,
            ]; },
    };
};

export default TodoPage;
