import m from "mithril";
import moment from "moment";
import { createTodo } from "../models/actions";
import {store, getCurrentDate} from "../models/store";
import { Date } from "sugar";

export default function (isE: boolean = true) {
    let title = "";
    let deadlineInputText = "";
    let deadline: Date | null = null;

    var isEdit = isE;

    function create() {
        store.dispatch(createTodo(title, deadline));
    }

    function edit() {
    }

    return {
        view: function() {
            return m("main.edit-container", m("form.edit-form", {
                onsubmit: function (e: any) {
                    e.preventDefault();
                    create();//TODO
                }
            }, [
                m("input[type=text]",
                  {name: "title", placeholder: "Title",
                   oninput: function (e: any) {title = e.currentTarget.value;},
                   value: title
                  }),
                m("div.date", [
                    m("input[type=text].date-input",
                      {name: "deadline", placeholder: "Deadline",
                       oninput: function (e: any) {
                           deadlineInputText = e.currentTarget.value;
                           const date = Date.create(deadlineInputText, {future: true});
                           if (Date.isValid(date)) {
                               deadline = date;
                           } else {
                               const inDate = Date.create("in " + deadlineInputText, {future: true});
                               if (Date.isValid(inDate)) {
                                   deadline = inDate;
                               } else {
                                   deadline = null;
                               }
                           }
                       },
                       value: deadlineInputText
                      }),
                    m("h3.date-display", deadline ? deadline.toUTCString() : "Never")
                ]),
                m("button[type=submit].login-button",
                  m("div.button-text", "Submit"))
            ]))
        }
    }
}
