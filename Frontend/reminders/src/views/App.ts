import m from "mithril";
import TodoPage from "./TodoPage";
import Login from "./Login";
import Message from "./Message";

import {store} from "../models/store";

export default function () {
    const login = Login();

    return {
        view: function() {
            const state = store.getState();
            var main;
            if (state.loginDetails) {
                if (state.modal) {
                    main = m(state.modal);
                } else {
                    main = m(TodoPage);
                }
            } else {
                main = m(login);
            }
            return [
                main,
                m(Message)
            ]
        }
    }
}
