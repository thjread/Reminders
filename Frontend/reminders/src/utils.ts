//import moment from "moment";
import { Date } from "sugar";

export function formatDateTime(d: Date) {
    //return moment(d).calendar(new Date());
    let format_time = '{hours}:{mm}{tt}';
    if (d.getHours() === 0 && d.getMinutes() === 0) {
        format_time = '';
    }
    let format_day = ' {d} {Month}';
    if (Date.isYesterday(d)) {
        format_day = ' Yesterday';
    } else if (Date.isToday(d)) {
        format_day = ' Today';
        format_time = '{hours}:{mm}{tt}';
    } else if (Date.isTomorrow(d)) {
        format_day = ' Tomorrow';
    } else if (Date.daysUntil(Date.create('today'), d) < 7) {
        format_day = ' {Weekday}';
    }
    let format_year = ' {year}'
    if (Date.isThisYear(d)) {
        format_year = '';
    }
    return Date.format(d, format_time + format_day + format_year);
}
