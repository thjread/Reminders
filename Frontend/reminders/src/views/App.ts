import m from "mithril";
import Message from "./Message";

const App: m.Component = {
    view: function(vnode) {
        return [
            vnode.children,
            m(Message)
        ]
    }
}

export default App;
