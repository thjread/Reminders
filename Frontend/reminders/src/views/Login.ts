import m from "mithril";
import * as auth from "../models/auth";

export default () => {
    let username = "";
    let password = "";

    let isLogin = true;
    let pending = false;

    function doLogin(vnode: any, details: auth.LoginDetails | void) {
        pending = false;
        if (details) {
            vnode.dom.classList.add("login-exit");
            vnode.dom.addEventListener("animationend", () => {
                auth.doLogin(details);
            });
        }
    }

    const login = (vnode: m.Vnode) => {
        pending = true;
        auth.login(username, password).then((d) => doLogin(vnode, d));
    };

    const signup = (vnode: m.Vnode) => {
        pending = true;
        auth.signup(username, password).then((d) => doLogin(vnode, d));
    };

    return {
        oninit() {
            username = "";
            password = "";
            isLogin = true;
        },

        oncreate() {
            const u = document.getElementById("username");
            if (u) {
                u.focus();
            }
        },

        view(vnode: m.Vnode) {
            return m("div.login-page", [
                m("header.login-header", m("div.login-header-inner", [
                    m("div.login-title-container", [
                        m("img.login-logo", { src: "images/logo.svg", alt: "Logo" }),
                        m("h1.login-title", "Reminders"),
                    ]),
                    m("p.login-description", "A todo list that syncs across multiple devices and works offline"),
                ])),
                m("main.login-container", m("form.modal-form.login-form", {
                    onsubmit(e: any) {
                        e.preventDefault();
                        if (isLogin) {
                            login(vnode);
                        } else {
                            signup(vnode);
                        }
                    },
                }, [
                    m("h2.form-title.title-font", "LOGIN"),
                    m("input[type=text].text-input#username",
                      { name: "username", placeholder: "Username",
                        "aria-label": "Username",
                        autocomplete: "off", autocorrect: "off",
                        autocapitalize: "off", spellcheck: "false",
                        oninput(e: any) { username = e.currentTarget.value; },
                        value: username,
                      }),
                    m("input[type=password].text-input",
                      { name: "password", placeholder: "Password", "aria-label": "Password",
                       oninput(e: any) { password = e.currentTarget.value; },
                       value: password,
                      }),
                    m("div.login-signup", [
                        m("button[type=submit].pill-button.large-fixed.on-secondary.fill",
                          { class: pending ? "processing" : undefined},
                          m("div.button-text",
                            isLogin ?
                            (pending ? "Logging in..." : "Log in") :
                            (pending ? "Signing up..." : "Sign up"),
                           )),
                        m("button[type=button].text-button",
                          { onclick() { isLogin = !isLogin; } },
                          isLogin ? "Sign up" : "Log in"),
                    ]),
                ])),
            ]);
        },
    };
};
