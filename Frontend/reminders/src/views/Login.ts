import m from "mithril";
import * as auth from "../models/auth";

export default function (isLogin: boolean = true) {
    let username = "";
    let password = "";

    const login = function() {
        auth.login(username, password)
        console.log("Log in " + username);
    }

    const signup = function() {
        auth.signup(username, password)
        console.log("Sign up " + username);
    }

    return {
        view: function() {
            return m("main.login-container", m("form.login-form", {
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
                    m("button[type=submit].login-button",
                      m("div.button-text", isLogin ? "Log in" : "Sign up")),
                    m("button[type=button].signup-button",
                      { onclick: function() { if (isLogin) {
                          m.route.set("/signup");
                      } else {
                          m.route.set("/login");
                      }}},
                      isLogin ? "Sign up" : "Log in")
                ])
            ]))
        }
    }
}
