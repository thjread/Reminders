import m from "mithril";
import { store } from "./models/store"; // initialise store
import { storeState, askServerForTodos, serverUpdate } from "./models/update";
import { loadFonts, sugarDateTime } from "./utils";
import { handleShortcuts } from "./models/ui";
import { swInit } from "./models/sw-manager";
import App from "./views/App";
import {Show} from "./views/TodoPage";
import TodoPage from "./views/TodoPage";
import Login from "./views/Login";
import { loggedIn } from "./models/auth";

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
            return m(App, m(TodoPage, {show: Show.Normal}))
        }
    },
    "/completed": {
        onmatch: function() {
            if (!loggedIn()) {
                m.route.set("/login");
            }
        },
        render: function() {
            return m(App, m(TodoPage, {show: Show.Completed}));
        }
    }
});

askServerForTodos();
const syncInterval = setInterval(serverUpdate, 5000);
window.addEventListener("online", _ => serverUpdate());
window.addEventListener("offline", _ => m.redraw());// make sure sync indicator redraws
window.addEventListener("keydown", e => handleShortcuts(e));

swInit();
