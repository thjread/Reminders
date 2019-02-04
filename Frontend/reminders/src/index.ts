import m from "mithril";
import { loggedIn } from "./models/auth";
import { store } from "./models/store"; // initialise store
import { storeState, askServerForTodos, serverUpdate } from "./models/actions";
import App from "./views/App";
import Login from "./views/Login";
store.subscribe(storeState)

m.route(document.body, "/",
        {
    "/": App,
    "/login": Login(),
    "/signup": Login(false)
});
if (!loggedIn) {
    m.route.set("/login");
}

askServerForTodos();

const syncInterval = setInterval(serverUpdate, 5000);
window.addEventListener("online", _ => serverUpdate());

/*if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", {scope: "/"}).then(function (reg) {
        if(reg.installing) {
            console.log('Service worker installing');
        } else if(reg.waiting) {
            console.log('Service worker installed');
        } else if(reg.active) {
            console.log('Service worker active');
        }
    }).catch(function(error) {
        console.log('Registration failed with ' + error);
    });
}*/
