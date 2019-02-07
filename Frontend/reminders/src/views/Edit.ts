import m from "mithril";
import { setModal, createTodo } from "../models/actions";
import {store, getTodo} from "../models/store";
import { Date } from "sugar";
import {formatDateTime} from "../utils";

export default function (editId: string | null = null) {
    let title = "";
    let deadlineInputText = "";
    let deadline: Date | null = null;
    let done = false;

    if (editId) {
        const todo = getTodo(editId);
        title = todo.title;
        if (todo.deadline) {
            deadline = todo.deadline;
            deadlineInputText = formatDateTime(deadline);
        }
    }

    function create() {
        store.dispatch(createTodo(title, deadline));
        store.dispatch(setModal(null));
    }

    function edit() {
        //store.dispatch(editTodo(title, deadline)); TODO
        store.dispatch(setModal(null));
    }

    return {
        view: function() {
            return m("main.edit-container", m("form.edit-form", {
                onsubmit: function (e: any) {
                    e.preventDefault();
                    if (title == "") return;
                    if (editId) {
                        edit();
                    } else {
                        create();
                    }
                }
            }, [
                m("button[type=button].signup-button", {
                    onclick: function() { store.dispatch(setModal(null)); } }, "Back"),
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
                    m("h3.date-display", deadline ? formatDateTime(deadline) : "Never")
                ]),
                m("button[type=submit].login-button",
                  m("div.button-text", "Submit"))
            ]))
        }
    }
}
