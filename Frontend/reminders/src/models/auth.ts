import m from "mithril";
import { store, State } from "./store";
import { logoutResetStore, setState } from "./actions";
import { stateFromStorage, logoutClearStorage, serverUpdate } from "./update";
import { showMessage, clearMessage } from "./ui";
import { pushSubscribe, pushUnsubscribe } from "./sw-manager";

declare var API_URI: boolean; // provided by webpack

export interface LoginDetails {
    username: string;
    userid: string;
    jwt: string;
}

export function loggedIn(state: State = store.getState()) {
    return state.loginDetails ? true : false;
}

export function doLogin(loginDetails: LoginDetails) {
    store.dispatch(setState(stateFromStorage(loginDetails)));
    serverUpdate([]);
    clearMessage();
    pushSubscribe();
    m.route.set("/");
}

export function login(username: string, password: string) {
    logout();
    return m.request({
        method: "POST",
        url: API_URI+"/login",
        body: { username, password },
    }).then((response: any) => {
        switch (response.type) {
            case "Success":
                const loginDetails: LoginDetails = {
                    username,
                    userid: response.userid,
                    jwt: response.jwt,
                };
                return loginDetails;
            case "UsernameNotFound":
                showMessage("User \"" + username + "\" not found");
                break;
            case "IncorrectPassword":
                showMessage("Incorrect password");
                break;
        }
    }).catch((e) => {
        if (e.code !== 0 && e.code !== 503) {
            showMessage("Server error");
        } else {
            showMessage("Failed to reach server - please check your internet connection and try again");
        }
    });
}

export function logout(unsubscribeAndClearData: boolean = true) {
    if (unsubscribeAndClearData) {
        logoutClearStorage();
        pushUnsubscribe();
    }
    store.dispatch(logoutResetStore());
    m.route.set("/login");
}

export function signup(username: string, password: string) {
    if (password.length === 0) {
        showMessage("Please enter a password");
        return Promise.resolve();
    }
    logout();
    return m.request({
        method: "POST",
        url: API_URI+"/signup",
        body: { username, password },
    }).then((response: any) => {
        switch (response.type) {
            case "Success":
                const loginDetails: LoginDetails = {
                    username,
                    userid: response.userid,
                    jwt: response.jwt,
                };
                return loginDetails;
            case "UsernameTooLong":
                showMessage("Username \"" + username + "\" is too long (max 100 characters)");
                break;
            case "UsernameTaken":
                showMessage("Username \"" + username + "\" is already taken");
                break;
        }
    }).catch((e) => {
        if (e.code !== 0 && e.code !== 503) {
            showMessage("Server error");
        } else {
            showMessage("Failed to reach server - please check your internet connection and try again");
        }
    });
}
