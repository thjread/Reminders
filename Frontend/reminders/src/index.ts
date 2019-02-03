import m from "mithril";
import App from "./views/App";
import { askServerForTodos, serverUpdate } from "./models/actions";
import "./models/store"; // initialise store

m.mount(document.body, App);

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
