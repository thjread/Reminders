import {Date as SDate} from "sugar";

export const sugarFormatDateTime = (d: Date) => {
    // TODO rewrite this to not use sugar
    let format_time = ' {hours}:{mm}{tt}';
    if (d.getHours() === 0 && d.getMinutes() === 0) {
        format_time = '';
    }
    let format_day = '{Weekday} {do} {Mon}';
    if (SDate.isYesterday(d)) {
        format_day = 'Yesterday';
    } else if (SDate.isToday(d)) {
        format_day = 'Today';
    } else if (SDate.isTomorrow(d)) {
        format_day = 'Tomorrow';
    } else if (d.getTime() > Date.now() && SDate.daysUntil(SDate.create('today'), d) < 7) {
        format_day = '{Weekday}';
    }
    let format_year = '{year} '
    if (SDate.isThisYear(d)) {
        format_year = '';
    }
    return SDate.format(d, format_year + format_day + format_time);
}

export const sugarParseDate = (s: string) => {
    SDate.setLocale('en-GB');
    const date = SDate.create(s, {future: true});
    if (SDate.isValid(date)) {
        return date;
    } else {
        const inDate = SDate.create("in " + s, {future: true});
        if (SDate.isValid(inDate)) {
            return inDate;
        } else {
            return null;
        }
    }
}
