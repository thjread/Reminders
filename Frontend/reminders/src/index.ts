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
import { loggedIn } from "./models/auth";

const SERVER_SYNC_INTERVAL = 5000;

loadFonts()
    .then(function() {
        document.body.classList.add('fonts-loaded');
    }, function() {
        console.log('Fonts not available');
    });

store.subscribe(storeState);
sugarDateTime();

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
        onmatch: function() {
            if (!loggedIn()) {
                m.route.set("/login");
            }
        },
        render: function() {
            return m(App, m(TodoPage, {context: TodoContext.Normal}))
        }
    },
    "/upcoming": {
        onmatch: function() {
            if (!loggedIn()) {
                m.route.set("/login");
            }
        },
        render: function() {
            return m(App, m(TodoPage, {context: TodoContext.Upcoming}));
        }
    },
    "/completed": {
        onmatch: function() {
            if (!loggedIn()) {
                m.route.set("/login");
            }
        },
        render: function() {
            return m(App, m(TodoPage, {context: TodoContext.Completed}));
        }
    }
});

serverUpdate();
const syncInterval = setInterval(serverUpdate, SERVER_SYNC_INTERVAL);
window.addEventListener("online", _ => serverUpdate());
window.addEventListener("offline", _ => m.redraw());// make sure sync indicator redraws
window.addEventListener("keydown", e => handleShortcuts(e));

swInit();
