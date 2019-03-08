import m from "mithril";
import { setModal, editTodo, createTodo, addShortcut, removeShortcut } from "../models/actions";
import { showMessage, clearMessage } from "../models/ui";
import {store, getTodo} from "../models/store";
import {formatDateTime} from "../utils";
import { serverUpdate } from "../models/update";

export default function (dateParseFunction: (s: string) => Date | null, editId: string | null = null) {
    let title = "";
    let deadlineInputText = "";
    let deadline: Date | null = null;
    let invalidDeadline = false;
    let done = false;
    let hide_until_done = true;

    if (editId) {
        const todo = getTodo(editId);
        title = todo.title;
        if (todo.deadline) {
            deadline = todo.deadline;
            deadlineInputText = formatDateTime(deadline);
        }
        done = todo.done;
        hide_until_done = todo.hide_until_done;
    }

    function submit() {
        if (title === "") {
            showMessage("Please enter a title");
            return;
        }
        if (invalidDeadline) {
            showMessage("Please enter a valid deadline");
            return;
        }
        clearMessage();
        if (editId) {
            store.dispatch(editTodo(editId, title, deadline, hide_until_done));
            serverUpdate();
        } else {
            let done_time = undefined;
            if (done) {
                done_time = new Date();
            }
            store.dispatch(createTodo(title, deadline, done, done_time, new Date(), hide_until_done));
            serverUpdate();
        }
        store.dispatch(setModal(null));
    }

    function cancel() {
        clearMessage();
        store.dispatch(setModal(null));
    }

    return {
        oninit: function() {
            store.dispatch(addShortcut("Escape 000", {
                callback: cancel,
                anywhere: true,
                preventDefault: true
            }));
            store.dispatch(addShortcut("Enter 010", {
                callback: submit,
                anywhere: true,
                preventDefault: true
            }));
        },

        onremove: function() {
            store.dispatch(removeShortcut("Escape 000"));
        },

        oncreate: function() {
            const title = document.getElementById("title");
            if (title) {
                title.focus();
            }
        },

        view: function() {
            return m("main.modal-container", m("form.modal-form.edit-form", {
                autocomplete: "off",
                onsubmit: function (e: any) {
                    e.preventDefault();
                    submit();
                }
            }, [
                m("button[type=button].text-button.on-secondary", {
                    onclick: cancel }, "Cancel"),
                m("textarea.text-input#title",// make text-area with rows=several, max-height=small, transition max-height to expand when more than one line of text input
                  {name: "title", placeholder: "Title", "aria-label": "Title",
                   oninput: function (e: any) {title = e.currentTarget.value;},
                   value: title,
                   rows: 7,
                   class: (title.length > 27 || title.indexOf("\n") > -1) ? "expand" : undefined
                  }),
                m("input[type=text].text-input",
                  {name: "deadline", placeholder: "Time", "aria-label": "time",
                   oninput: function (e: any) {
                       deadlineInputText = e.currentTarget.value;
                       deadline = dateParseFunction(deadlineInputText);
                       if (deadlineInputText !== "" && deadline === null) {
                           invalidDeadline = true;
                       } else {
                           invalidDeadline = false;
                       }
                   },
                   value: deadlineInputText
                  }),
                m("h3.item-deadline.on-edit-form", deadline ? formatDateTime(deadline) : (invalidDeadline ? "Invalid time" : "No time")),
                m("div.show-in-deadlines", [
                    m("input#deadline-check[type=checkbox]", {
                        checked: !hide_until_done,
                        oninput: (e: Event) => {
                            if (e.target && (e.target as HTMLInputElement).checked !== null) {
                                hide_until_done = !(e.target as HTMLInputElement).checked;
                            }
                        }
                    }),
                    m("label.css-check.on-secondary", {for: "deadline-check"}),
                    m("label.deadline-check-label", {for: "deadline-check"}, "Show in Deadlines")
                ]),
                m("button[type=submit].pill-button.on-secondary.large.fill",
                  m("div.button-text", "Submit"))
            ]))
        }
    }
}
