import m from "mithril";
import Message from "./Message";

import {store} from "../models/store";

const App: m.Component = {
    view: function(vnode) {
        const state = store.getState();
        return [
            vnode.children,
            state.modal ? m(state.modal) : undefined,
            m(Message)
        ]
    }
}

export default App;
