import { Date as SDate } from "sugar";

export function formatDateTime(d: Date) {
    let format_time = '{hours}:{mm}{tt}';
    if (d.getHours() === 0 && d.getMinutes() === 0) {
        format_time = '';
    }
    let format_day = ' {d} {Month}';
    if (SDate.isYesterday(d)) {
        format_day = ' Yesterday';
    } else if (SDate.isToday(d)) {
        format_day = ' Today';
        format_time = '{hours}:{mm}{tt}';
    } else if (SDate.isTomorrow(d)) {
        format_day = ' Tomorrow';
    } else if (SDate.daysUntil(SDate.create('today'), d) < 7) {
        format_day = ' {Weekday}';
    }
    let format_year = ' {year}'
    if (SDate.isThisYear(d)) {
        format_year = '';
    }
    return SDate.format(d, format_time + format_day + format_year);
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
