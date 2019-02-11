import m from "mithril";
import { store } from "./store";
import { logoutResetStore, setState } from "./actions";
import { stateFromStorage, serverUpdate } from "./update";

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
        url: API_URI+"/login", // TODO make ssl
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
                break;
            case "UsernameNotFound":
                console.log("Username " + username + " not found");//TODO
                break;
            case "IncorrectPassword":
                console.log("Incorrect password");//TODO
                break;
        }
    }).catch(function (e) {
        console.log("Log in failed with error " + e.message);//TODO notice when offline
    })
}

export function logout() {
    store.dispatch(logoutResetStore());
}

export function signup(username: string, password: string) {
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
                break;
            case "UsernameTooLong":
                console.log("Username " + username + " too long");//TODO
                break;
            case "UsernameTaken":
                console.log("Username " + username + " already taken");//TODO
                break;
        }
    }).catch(function (e) {
        console.log("Sign up failed with error " + e.message);//TODO notice when offline
    })
}
