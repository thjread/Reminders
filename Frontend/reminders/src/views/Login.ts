import m from "mithril";
import * as auth from "../models/auth";

export default function (isL: boolean = true) {
    let username = "";
    let password = "";

    var isLogin = isL;

    const login = function() {
        auth.login(username, password)
        console.log("Log in " + username);
    }

    const signup = function() {
        auth.signup(username, password)
        console.log("Sign up " + username);
    }

    return {
        oninit: function() {
            username = "";
            password = "";
        },

        view: function() {
            return m("main.modal-container", m("form.modal-form", {
                onsubmit: function (e: any) {
                    e.preventDefault();
                    if (isLogin) {
                        login();
                    } else {
                        signup();
                    }
                }
            }, [
                m("input[type=text]",
                  {name: "username", placeholder: "Username",
                   oninput: function (e: any) {username = e.currentTarget.value;},
                   value: username
                  }),
                m("input[type=password]",
                  {name: "password", placeholder: "Password",
                   oninput: function (e: any) {password = e.currentTarget.value;},
                   value: password
                  }),
                m("div.login-signup", [
                    m("button[type=submit].pill-button.on-secondary",
                      m("div.button-text", isLogin ? "Log in" : "Sign up")),
                    m("button[type=button].text-button",
                      { onclick: function() { isLogin = !isLogin } },
                      isLogin ? "Sign up" : "Log in")
                ])
            ]))
        }
    }
}