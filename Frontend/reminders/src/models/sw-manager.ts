import { loggedIn } from "./auth";
import { urlBase64ToUint8Array } from "../utils";

var registration: null | ServiceWorkerRegistration = null;

export function swInit() {
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
                registration = reg;
                if (loggedIn()) {
                    pushSubscribe();
                }
            }).catch(function(error) {
                console.log("Service worker registration failed with " + error);
            });
        });
    }
}

export function pushSubscribe() {
    if (registration) {
        registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BPIRY5FILkfU3oWiL5_glenBme7ryX39oucdQqwjl_EHME9f4IDSC2mQdIQe-Hnu5viH1kUPnjZCUlTvlnfNSeY=')
        }).then(function (pushSubscription) {
            console.log("hi");
            console.log(JSON.stringify(pushSubscription));
        }).catch(function (error) {
            console.log("Push manager subscription failed with " + error);
        })
    }
}

export function pushUnsubscribe() {
    console.log("TODO");
}
