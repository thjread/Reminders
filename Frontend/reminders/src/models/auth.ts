import m from "mithril";
import { store } from "./store";
import { logoutResetStore, setLoginDetails } from "./actions";
import { serverUpdate, storeState } from "./update";

export interface LoginDetails {
    username: string;
    userid: string;
    jwt: string;
}

export function login(username: string, password: string) {
    logout();
    m.request({
        method: "POST",
        url: "http://localhost:3000/api/login",
        data: {username, password}
    }).then(function (response: any) {
        switch (response.type) {
            case "Success":
                store.dispatch(setLoginDetails(username, response.userid, response.jwt));
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
    if (store.getState().syncActions.length > 0) {
        console.log("WARNING: will lose unsaved offline data");// TODO
    }
    store.dispatch(logoutResetStore());
    storeState();
}

export function signup(username: string, password: string) {
    logout();
    m.request({
        method: "POST",
        url: "http://localhost:3000/api/signup",
        data: {username, password}
    }).then(function (response: any) {
        switch (response.type) {
            case "Success":
                store.dispatch(setLoginDetails(username, response.userid, response.jwt));
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
