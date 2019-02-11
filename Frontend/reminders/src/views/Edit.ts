import m from "mithril";
import { setModal, editTodo, createTodo } from "../models/actions";
import {store, getTodo} from "../models/store";
import {formatDateTime} from "../utils";

export default function (dateParseFunction: (s: string) => Date | null, editId: string | null = null) {
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
        oncreate: function() {
            const title = document.getElementById("title");
            if (title) {
                title.focus();
            }
        },

        view: function() {
            return m("main.modal-container", m("form.modal-form", {
                autocomplete: "off",
                onsubmit: function (e: any) {
                    e.preventDefault();
                    if (title == "") return;
                    dispatch();
                }
            }, [
                m("button[type=button].text-button.on-secondary", {
                    onclick: function() { store.dispatch(setModal(null)); } }, "Cancel"),
                m("input[type=text]#title",
                  {name: "title", placeholder: "Title", "aria-label": "Title",
                   oninput: function (e: any) {title = e.currentTarget.value;},
                   value: title
                  }),
                m("input[type=text].date-input",
                  {name: "deadline", placeholder: "Deadline", "aria-label": "Deadline",
                   oninput: function (e: any) {
                       deadlineInputText = e.currentTarget.value;
                       deadline = dateParseFunction(deadlineInputText);
                   },
                   value: deadlineInputText
                  }),
                m("h3.item-deadline.on-edit-form", deadline ? formatDateTime(deadline) : "No deadline"),
                m("button[type=submit].pill-button.on-secondary",
                  m("div.button-text", "Submit"))
            ]))
        }
    }
}
