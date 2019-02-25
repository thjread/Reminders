import m from "mithril";
import Message from "./Message";

import {store} from "../models/store";

const App: m.Component = {
    view: function(vnode) {
        const state = store.getState();
        var main;
        if (state.modal) {
            main = m(state.modal);
        } else {
            main = vnode.children;
        }
        return [
            main,
            m(Message)
        ]
    }
}

export default App;
