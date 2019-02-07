import moment from "moment";
//import { Date } from "sugar";

// TODO optimise moment with webpack or replace with own code

export function formatDateTime(d: Date) {
    return moment(d).calendar(new Date());
    //return Date.long(d);
}
