import m from "mithril";
import { store } from "./models/store"; // initialise store
import { storeState, askServerForTodos, serverUpdate } from "./models/update";
import App from "./views/App";

store.subscribe(storeState);

import Edit from "./views/Edit";
m.mount(document.body, Edit());

askServerForTodos();
//const syncInterval = setInterval(serverUpdate, 5000); TODO
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
