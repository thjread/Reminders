import m from "mithril";

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

export function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')
    ;
    const rawData = window.atob(base64);
    return Uint8Array.from([...Array.from(rawData)].map((char) => char.charCodeAt(0)));
}
