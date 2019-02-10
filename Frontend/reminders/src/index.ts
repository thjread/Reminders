import m from "mithril";
import { store } from "./models/store"; // initialise store
import { storeState, askServerForTodos, serverUpdate } from "./models/update";
import { sugarDateTime } from "./utils";
import App from "./views/App";

store.subscribe(storeState);
sugarDateTime();

m.mount(document.body, App);

askServerForTodos();
const syncInterval = setInterval(serverUpdate, 5000);
window.addEventListener("online", _ => serverUpdate());

if ("serviceWorker" in navigator) {
    window.addEventListener('load', function () {
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
    });
}

