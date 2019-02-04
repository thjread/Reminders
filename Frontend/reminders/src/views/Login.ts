import m from "mithril";
import * as auth from "../models/auth";

export default function () {
    let username = "";
    let password = "";

    const login = function() {
        auth.login(username, password)
        console.log("Log in " + username);
    }

    return {
        view: function() {
            return m("main.login-container", m("form.login-form", {
                onsubmit: function (e: any) {
                    e.preventDefault();
                    login();
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
                m("button[type=submit].login-button", m("div.button-text", "Log in"))
            ]))
        }
    }
}
