// tslint:disable:no-console

import m from "mithril";
import { logout, loggedIn } from "./auth";
import { urlBase64ToUint8Array } from "../utils";
import { store } from "./store";
import { toggleDone } from "./actions";
import { showMessage } from "./ui";

declare var API_URI: boolean; // provided by webpack

let registration: null | ServiceWorkerRegistration = null;
let subscription: null | PushSubscription = null;

export function swInit() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js", { scope: "/"}).then((reg) => {
                if (reg.installing) {
                    console.log("Service worker installing");
                } else if (reg.waiting) {
                    console.log("Service worker installed");
                } else if (reg.active) {
                    console.log("Service worker active");
                }
                registration = reg;
                if (loggedIn()) {
                    pushSubscribe();
                }
            }).catch((error) => {
                console.log("Service worker registration failed with " + error);
            });
        });
        navigator.serviceWorker.addEventListener("message", (event) => {
            switch (event.data.type) {
                case "DONE":
                    const state = store.getState();
                    if (state.loginDetails && state.loginDetails.userid === event.data.userid) {
                        const id = event.data.id;
                        store.dispatch(toggleDone(id, true));
                    }
                    break;
            }
        });
    }
}

export function pushSubscribe() {
    const state = store.getState();
    if (registration && state.loginDetails) {
        const jwt = state.loginDetails.jwt;
        if ("pushManager" in registration) {
            registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    "BPIRY5FILkfU3oWiL5_glenBme7ryX39oucdQqwjl_EHME9f4IDSC2mQdIQe-Hnu5viH1kUPnjZCUlTvlnfNSeY="),
            }).then((pushSubscription) => {
                subscription = pushSubscription;
                console.log(JSON.stringify(pushSubscription));
                return m.request({
                    method: "POST",
                    url: API_URI+"/subscribe",
                    body: {
                        jwt,
                        info: pushSubscription,
                    },
                }).then((response: any) => {
                    switch (response.type) {
                        case "SUCCESS": {
                            console.log("Registered subscription info");
                            break;
                        }
                        case "INVALID_TOKEN":
                            showMessage("Authentication error");
                            logout();
                            break;
                        case "EXPIRED_TOKEN":
                            showMessage("Saved login details expired - please log in again");
                            logout(false);
                            break;
                        default:
                            showMessage("Server error");
                    }
                }).catch((e) => {
                    if (e.code !== 0) {
                        showMessage("Server error");
                    }
                });
            }).catch((error) => {
                console.log("Push manager subscription failed with " + error);
            });
        }
    }
}

export function pushUnsubscribe() {
    const state = store.getState();
    if (subscription && state.loginDetails) {
        const jwt = state.loginDetails.jwt;
        return m.request({
            method: "DELETE",
            url: API_URI+"/unsubscribe",
            body: {
                jwt,
                info: subscription,
            },
        }).then((response: any) => {
            switch (response.type) {
                case "SUCCESS": {
                    console.log("Removed subscription info");
                    break;
                }
                case "INVALID_TOKEN":
                    showMessage("Authentication error");
                    logout(false);
                    break;
                case "EXPIRED_TOKEN":
                    showMessage("Saved login details expired - please log in again");
                    logout(false);
                    break;
                default:
                    showMessage("Server error");
            }
        }).catch((e) => {
            if (e.code !== 0) {
                showMessage("Server error");
            }
        });
    }
}
