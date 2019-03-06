const Sugar = require("./sugar");

export const sugarFormatDateTime = (d: Date) => {
    // TODO rewrite this to not use sugar
    let format_time = ' {hours}:{mm}{tt}';
    if (d.getHours() === 0 && d.getMinutes() === 0) {
        format_time = '';
    }
    let format_day = '{Dow} {do} {Mon}';
    if (Sugar.Date.isYesterday(d)) {
        format_day = 'Yesterday';
    } else if (Sugar.Date.isToday(d)) {
        format_day = 'Today';
    } else if (Sugar.Date.isTomorrow(d)) {
        format_day = 'Tomorrow';
    } else if (d.getTime() > Date.now() && Sugar.Date.daysUntil(Sugar.Date.create('today'), d) < 7) {
        format_day = '{Dow}';
    }
    let format_year = '{year} '
    if (Sugar.Date.isThisYear(d)) {
        format_year = '';
    }
    return Sugar.Date.format(d, format_year + format_day + format_time);
}

export const sugarParseDate = (s: string) => {
    const locale = navigator.language;
    try {
        Sugar.Date.setLocale(locale);
    }
    catch (err) {
        console.log("Locale " + locale + " not supported, reverting to 'en'")
    }
    const date = Sugar.Date.create(s, {future: true});
    if (Sugar.Date.isValid(date)) {
        return date;
    } else {
        const inDate = Sugar.Date.create("in " + s, {future: true});
        if (Sugar.Date.isValid(inDate)) {
            return inDate;
        } else {
            return null;
        }
    }
}
