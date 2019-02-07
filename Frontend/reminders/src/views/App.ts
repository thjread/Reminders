import m from "mithril";
import TodoPage from "./TodoPage";
import Login from "./Login";

import {store} from "../models/store";

export default function () {
    const login = Login();

    return {
        view: function() {
            const state = store.getState();
            if (state.loginDetails) {
                if (state.modal) {
                    return m(state.modal);
                } else {
                    return m(TodoPage);
                }
            } else {
                return m(login);
            }
        }
    }
}
