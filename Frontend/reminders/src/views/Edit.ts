import m from "mithril";
import { setModal, editTodo, createTodo } from "../models/actions";
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
        done = todo.done;
    }

    function dispatch() {
        if (editId) {
            store.dispatch(editTodo(editId, title, deadline, done));
        } else {
            store.dispatch(createTodo(title, deadline, done));
        }
        store.dispatch(setModal(null));
    }

    return {
        view: function() {
            return m("main.modal-container", m("form.modal-form", {
                onsubmit: function (e: any) {
                    e.preventDefault();
                    if (title == "") return;
                    dispatch();
                }
            }, [
                m("button[type=button].text-button.on-secondary", {
                    onclick: function() { store.dispatch(setModal(null)); } }, "Cancel"),
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
                m("button[type=submit].pill-button.on-secondary",
                  m("div.button-text", "Submit"))
            ]))
        }
    }
}
