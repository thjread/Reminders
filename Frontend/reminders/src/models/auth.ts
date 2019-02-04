import m from "mithril";

export var username = "";
export var userid = "";
export var loggedIn = false;

export function login(username: string, password: string) {
    m.request({
        method: "POST",
        url: "http://localhost:3000/api/login",
        data: {username, password}
    }).then(function (response) {
        console.log(response);
    }).catch(function (e) {
        console.log("Log in failed with error " + e.message);
    })
}

export function signup(username: string, password: string) {
    m.request({
        method: "POST",
        url: "http://localhost:3000/api/signup",
        data: {username, password}
    }).then(function (response) {
        console.log(response);
    }).catch(function (e) {
        console.log("Sign up failed with error " + e.message);
    })
}
