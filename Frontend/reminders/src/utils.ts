import m from "mithril";

import { store, Message } from "./models/store";
import { setMessage } from "./models/actions";

export let formatDateTime = (d: Date) => {
    return d.toLocaleTimeString() + " " + d.toLocaleDateString();
}

export function sugarDateTime() {
    import(/* webpackChunkName: "sugar", webpackPreload: true */ "./sugar-utils").then(({sugarFormatDateTime}) => {
        formatDateTime = sugarFormatDateTime;
        m.redraw();
    }).catch((e) => "Error " + e + " while loading Sugar library");
}

export function dateTimeReviver(_: any, value: any) {
    if (typeof value === 'string') {
        const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
        if (reISO.exec(value)) {
            return new Date(value);
        }
    }
    return value;
}

export function showMessage(text: string) {
    const message: Message = {
        text,
        time: new Date()
    }
    store.dispatch(setMessage(message));
}
