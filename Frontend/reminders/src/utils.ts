//import moment from "moment";
import { Date } from "sugar";

export function formatDateTime(d: Date) {
    //return moment(d).calendar(new Date());
    return Date.long(d);
}
