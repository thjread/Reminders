import m from "mithril";
import { store } from "../models/store";

export const MESSAGE_SHOW_TIME = 10*1000;

export default {
    view() {
        let display = false;
        let text = "";
        const message = store.getState().message;
        if (message) {
            text = message.text;
            if ((Date.now() - message.time.getTime()) < MESSAGE_SHOW_TIME) {
                display = true;
            }
        }
        return m("footer.message", { class: display ? undefined : "hidden"}, text);
    },
};
