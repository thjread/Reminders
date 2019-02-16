import m from "mithril";
import TodoPage from "./TodoPage";
import Login from "./Login";
import Message from "./Message";

import {store} from "../models/store";
import { loggedIn } from "../models/auth";

export default function () {
    const login = Login();

    return {
        view: function() {
            const state = store.getState();
            var main;
            if (loggedIn(state)) {
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
