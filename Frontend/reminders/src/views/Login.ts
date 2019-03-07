import m from "mithril";
import * as auth from "../models/auth";

export default function () {
    let username = "";
    let password = "";

    let isLogin = true;
    let pending = false;

    const login = function() {
        pending = true;
        auth.login(username, password).then(() => {pending = false});
    }

    const signup = function() {
        pending = true;
        auth.signup(username, password).then(() => {pending = false});
    }

    return {
        oninit: function() {
            username = "";
            password = "";
            isLogin = true;
        },

        oncreate: function() {
            const username = document.getElementById("username");
            if (username) {
                username.focus();
            }
        },

        view: function() {
            return m("main.modal-container", m("form.modal-form.login-form", {
                onsubmit: function (e: any) {
                    e.preventDefault();
                    if (isLogin) {
                        login();
                    } else {
                        signup();
                    }
                }
            }, [
                m("input[type=text].text-input#username",// TODO wrap in a div
                  {name: "username", placeholder: "Username", "aria-label": "Username",
                   oninput: function (e: any) {username = e.currentTarget.value;},
                   value: username
                  }),
                m("input[type=password].text-input",
                  {name: "password", placeholder: "Password", "aria-label": "Password",
                   oninput: function (e: any) {password = e.currentTarget.value;},
                   value: password
                  }),
                m("div.login-signup", [
                    m("button[type=submit].pill-button.large-fixed.on-secondary.fill",
                      {class: pending ? "processing" : undefined},
                      m("div.button-text",
                        isLogin ?
                        (pending ? "Logging in..." : "Log in") :
                        (pending ? "Signing up..." : "Sign up")
                       )),
                    m("button[type=button].text-button",
                      { onclick: function() { isLogin = !isLogin } },
                      isLogin ? "Sign up" : "Log in")
                ])
            ]))
        }
    }
}
