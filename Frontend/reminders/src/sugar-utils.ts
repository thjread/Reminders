// tslint:disable-next-line:no-var-requires
const Sugar = require("./sugar");

export const sugarDateColorClass = (d: Date): string | undefined => {
    if (d.getTime() <= Date.now()) {
        return "due";
    } else if (Sugar.Date.isToday(d)) {
        return "today";
    } else if (Sugar.Date.isTomorrow(d)) {
        return "tomorrow";
    } else {
        const days = Sugar.Date.daysUntil(Sugar.Date.create("today"), d);
        if (days < 3) {
            return "overmorrow";
        } else if (days < 7) {
            return "week";
        } else {
            return "later";
        }
    }
};

export const sugarFormatDateTime = (d: Date) => {
    // TODO rewrite this to not use sugar
    let formatTime = " {hours}:{mm}{tt}";
    if (d.getHours() === 0 && d.getMinutes() === 0) {
        formatTime = "";
    }
    let formatDay = "{Dow} {do} {Mon}";
    if (Sugar.Date.isYesterday(d)) {
        formatDay = "Yesterday";
    } else if (Sugar.Date.isToday(d)) {
        formatDay = "Today";
    } else if (Sugar.Date.isTomorrow(d)) {
        formatDay = "Tomorrow";
    } else if (d.getTime() > Date.now() && Sugar.Date.daysUntil(Sugar.Date.create("today"), d) < 7) {
        formatDay = "{Weekday}";
    }
    let formatYear = "{year} ";
    if (Sugar.Date.isThisYear(d)) {
        formatYear = "";
    }
    return Sugar.Date.format(d, formatYear + formatDay + formatTime);
};

export const sugarParseDate = (s: string) => {
    const locale = navigator.language;
    try {
        Sugar.Date.setLocale(locale);
    } catch (err) {
        console.error("Locale " + locale + " not supported, reverting to 'en'");
    }
    const date = Sugar.Date.create(s, { future: true});
    if (Sugar.Date.isValid(date)) {
        return date;
    } else {
        const inDate = Sugar.Date.create("in " + s, { future: true});
        if (Sugar.Date.isValid(inDate)) {
            return inDate;
        } else {
            return null;
        }
    }
};
