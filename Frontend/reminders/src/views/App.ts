import m from "mithril";
import TodoPage from "./TodoPage";
import Login from "./Login";

import {store} from "../models/store";

export default function () {
    const login = Login();

    return {
        view: function() {
            if (store.getState().loginDetails) {
                return m(TodoPage);
            } else {
                return m(login);
            }
        }
    }
}
