import { createAction } from "typesafe-actions";
import m from "mithril";

export const toggleDone = createAction('TOGGLE_DONE', resolve => {
    return (id: string, done: boolean) => {
        m.request({
            method: "PUT",
            url: "http://localhost:3000/api/toggle_done",
            data: { id: id, done: done }
        }).then(function (result) {
            console.log(result);
        }).catch(function (e) {
            console.log(e);
        });
        return resolve({id, done})
    }
})
