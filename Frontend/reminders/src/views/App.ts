import m from "mithril";
import Message from "./Message";

const App: m.Component = {
    view(vnode) {
        return [
            vnode.children,
            m(Message),
        ];
    },
};

export default App;
