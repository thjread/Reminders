import m from "mithril";
import { store } from "./store";
import { logoutResetStore, setState } from "./actions";
import { stateFromStorage, serverUpdate } from "./update";
import { showMessage, clearMessage } from "./ui";

declare var API_URI: boolean;//provided by webpack

export interface LoginDetails {
    username: string;
    userid: string;
    jwt: string;
}

export function login(username: string, password: string) {
    logout();
    m.request({
        method: "POST",
        url: API_URI+"/login",
        data: {username, password}
    }).then(function (response: any) {
        switch (response.type) {
            case "Success":
                const loginDetails: LoginDetails = {
                    username,
                    userid: response.userid,
                    jwt: response.jwt
                }
                store.dispatch(setState(stateFromStorage(loginDetails)));
                serverUpdate([]);
                clearMessage();
                break;
            case "UsernameNotFound":
                showMessage("User \"" + username + "\" not found");
                break;
            case "IncorrectPassword":
                showMessage("Incorrect password");
                break;
        }
    }).catch(function (e) {
        if (e.code !== 0) {
            showMessage("Server error");
        } else {
            showMessage("Failed to reach server - please check your internet connection and try again");
        }
    })
}

export function logout() {
    store.dispatch(logoutResetStore());
}

export function signup(username: string, password: string) {
    if (password.length == 0) {
        showMessage("Please enter a password");
        return;
    }
    logout();
    m.request({
        method: "POST",
        url: API_URI+"/signup",
        data: {username, password}
    }).then(function (response: any) {
        switch (response.type) {
            case "Success":
                const loginDetails: LoginDetails = {
                    username,
                    userid: response.userid,
                    jwt: response.jwt
                }
                store.dispatch(setState(stateFromStorage(loginDetails)));
                serverUpdate([]);
                clearMessage();
                break;
            case "UsernameTooLong":
                showMessage("Username \"" + username + "\" is too long (max 100 characters)");
                break;
            case "UsernameTaken":
                showMessage("Username \"" + username + "\" is already taken");
                break;
        }
    }).catch(function (e) {
        if (e.code !== 0) {
            showMessage("Server error");
        } else {
            showMessage("Failed to reach server - please check your internet connection and try again");
        }
    })
}
