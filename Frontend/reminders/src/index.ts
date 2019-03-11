import m from "mithril";
import { store } from "./models/store"; // initialise store
import { storeState, serverUpdate } from "./models/update";
import { loadFonts, sugarDateTime } from "./utils";
import { handleShortcuts } from "./models/ui";
import { swInit } from "./models/sw-manager";
import App from "./views/App";
import {TodoContext} from "./views/TodoPage";
import TodoPage from "./views/TodoPage";
import Login from "./views/Login";
import Edit from "./views/Edit";
import { loggedIn } from "./models/auth";

const SERVER_SYNC_INTERVAL = 2000;
const SERVER_SYNC_HIDDEN_INTERVAL = 20000;

loadFonts()
    .then(function() {
        document.body.classList.add('fonts-loaded');
    }, function() {
        console.log('Fonts not available');
    });

store.subscribe(storeState);
sugarDateTime();

function todoPageQueryHandle(path: string, params: any) {
    if (params.hasOwnProperty("create")) {
        return import(/* webpackChunkName: "sugar", webpackPreload: true */ "./sugar-utils").then(({sugarParseDate}) => {
            return Edit(path, sugarParseDate);
        })
    } else if (params.hasOwnProperty("edit")) {
        if (store.getState().todos[params.edit]) {
            return import(/* webpackChunkName: "sugar", webpackPreload: true */ "./sugar-utils").then(({sugarParseDate}) => {
                return Edit(path, sugarParseDate, params.edit);
            })
        }
    }
}

m.route(document.body, "/", {
    "/login": {
        onmatch: function() {
            if (loggedIn()) {
                m.route.set("/");
            }
        },
        render: function() {
            return m(App, m(Login));
        }
    },
    "/": {
        onmatch: function(params) {
            if (!loggedIn()) {
                m.route.set("/login");
            }
            return todoPageQueryHandle("/", params);
        },
        render: function(vnode) {
            let modal;
            if (vnode.tag === "div") {
                modal = undefined;
            } else {
                modal = m(vnode.tag as m.Component);
            }
            return m(App, m(TodoPage, {context: TodoContext.Normal, modal}))
        }
    },
    "/upcoming": {
        onmatch: function(params) {
            if (!loggedIn()) {
                m.route.set("/login");
            }
            return todoPageQueryHandle("/upcoming", params);
        },
        render: function(vnode) {
            let modal;
            if (vnode.tag === "div") {
                modal = undefined;
            } else {
                modal = m(vnode.tag as m.Component);
            }
            return m(App, m(TodoPage, {context: TodoContext.Upcoming, modal}))
        }
    },
    "/completed": {
        onmatch: function(params) {
            if (!loggedIn()) {
                m.route.set("/login");
            }
            return todoPageQueryHandle("/completed", params);
        },
        render: function(vnode) {
            let modal;
            if (vnode.tag === "div") {
                modal = undefined;
            } else {
                modal = m(vnode.tag as m.Component);
            }
            return m(App, m(TodoPage, {context: TodoContext.Completed, modal}))
        }
    }
});

let syncInterval = setInterval(serverUpdate, SERVER_SYNC_INTERVAL);

function handleVisibilityChange() {
    clearInterval(syncInterval);
    if (document.hidden) {
        syncInterval = setInterval(serverUpdate, SERVER_SYNC_HIDDEN_INTERVAL);
    } else {
        serverUpdate();
        syncInterval = setInterval(serverUpdate, SERVER_SYNC_INTERVAL);
    }
}

serverUpdate();
handleVisibilityChange();
document.addEventListener("visibilitychange", handleVisibilityChange, false);

window.addEventListener("online", _ => serverUpdate());
window.addEventListener("offline", _ => m.redraw());// make sure sync indicator redraws
window.addEventListener("keydown", e => handleShortcuts(e));

swInit();
