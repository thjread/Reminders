import "./main.css";
import m from "mithril";
import { store } from "./models/store"; // initialise store
import { storeState, serverUpdate } from "./models/update";
import { sugarDateTime } from "./utils";
import { handleShortcuts } from "./models/ui";
import { swInit } from "./models/sw-manager";
import App from "./views/App";
import TodoPage from "./views/TodoPage";
import Login from "./views/Login";
import Edit from "./views/Edit";
import Snooze from "./views/Snooze";
import { loggedIn } from "./models/auth";

const SERVER_SYNC_INTERVAL = 2000;
const SERVER_SYNC_HIDDEN_INTERVAL = 20000;

sugarDateTime();
store.subscribe(storeState);

m.route(document.body, "/", {
    "/login": {
        onmatch() {
            if (loggedIn()) {
                m.route.set("/");
            }
        },
        render() {
            return m(App, m(Login));
        },
    },
    "/": {
        onmatch(params) {
            if (!loggedIn()) {
                m.route.set("/login");
            }
            if ("e" in params) {
                let editId: string | null = null;
                if (store.getState().todos[params.e]) {
                    editId = params.e;
                }
                return import(/* webpackChunkName: "sugar", webpackPreload: true */ "./sugar-utils")
                    .then(({ sugarParseDate}) => {
                    return Edit(params.c, sugarParseDate, editId);
                });
            }
            if ("s" in params && store.getState().todos[params.s]) {
                return import(/* webpackChunkName: "sugar", webpackPreload: true */ "./sugar-utils")
                    .then(({ sugarParseDate}) => {
                    return Snooze(params.c, sugarParseDate, params.s);
                });
            }
        },
        render(vnode) {
            let modal;
            if (vnode.tag === "div") {
                modal = undefined;
            } else {
                modal = m(vnode.tag as m.Component);
            }
            return m(App, m(TodoPage, { modal}));
        },
    },
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

window.addEventListener("online", () => serverUpdate());
window.addEventListener("offline", () => m.redraw()); // make sure sync indicator redraws
window.addEventListener("keydown", (e) => handleShortcuts(e));

swInit();
