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
const MENU_SWIPE_MARGIN = 30;
const MENU_SWIPE_OUT_DISTANCE = 70;
const MENU_SWIPE_IN_DISTANCE = 90;

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
    let showMenuDefault = false;
    const desktopQuery = window.matchMedia("only screen and (min-width: 700px)");// move this to global state if we want to use it anywhere else

    function desktopQueryHandle (q: MediaQueryListEvent | MediaQueryList) {
        if (q.matches) {
            showMenu = true;
            showMenuDefault = true;
        } else {
            showMenu = false;
            showMenuDefault = false;
        }
        m.redraw();
    }

    let swipingMenuOut = false;
    let startX = 0;

    function menuTouchStart(e: TouchEvent) {
        if (e.changedTouches.length == 1) {
            const touch = e.changedTouches[0];
            startX = touch.pageX;
            if (touch.pageX < MENU_SWIPE_MARGIN) {
                swipingMenuOut = true;
            }
        }
    }

    function menuTouchMove(e: TouchEvent) {
        if (e.changedTouches.length == 1) {
            const touch = e.changedTouches[0];
            const diff = touch.pageX - startX;
            if (diff > MENU_SWIPE_OUT_DISTANCE && swipingMenuOut) {
                swipingMenuOut = false;
                showMenu = true;
                m.redraw();
            } else if (diff < -MENU_SWIPE_IN_DISTANCE) {
                showMenu = false;
                m.redraw();
            }
        }
    }

    function menuTouchEnd(e: TouchEvent) {
        swipingMenuOut = false;
    }

    return {
        oninit: function() {
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

            let todoSections: (m.Vnode | undefined)[] = [];
            function section(ids: string[], title: string) {
                return ids.length > 0 ? m(TodoSection, {title: title, key: title}, m(TodoList, {todoIds: ids, context: vnode.attrs.context})) : undefined;
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
                        m("button.menu-icon", { onclick: () => {showMenu = !showMenu;}}, m.trust(MENU_SVG)),
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
                    m("div.menu-shadow", {onclick: () => {showMenu = false;}}),
                    m("div.menu-spacer"),
                    m("nav.menu", [
                        m("ul.menu-list", [
                            ["Reminders", "", vnode.attrs.context === TodoContext.Normal],
                            ["Upcoming", "upcoming", vnode.attrs.context === TodoContext.Upcoming],
                            ["Completed", "completed", vnode.attrs.context === TodoContext.Completed]
                        ].map(([title, path, selected]) => {
                            return m("li", m(`a[href=/${path}].main-nav-item`, {class: selected ? "selected" : undefined, oncreate: m.route.link, onclick: () => {showMenu = showMenuDefault;}}, title));
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
