import m from "mithril";
import { editTodo, createTodo, addShortcut,
         createShortcutContext, popShortcutContext } from "../models/actions";
import { showMessage, clearMessage } from "../models/ui";
import { store, getTodo } from "../models/store";
import { formatDateTime } from "../utils";
import { serverUpdate } from "../models/update";

export default (context: string, dateParseFunction: (s: string) => Date | null, editId: string | null = null) => {
    let title = "";
    let deadlineInputText = "";
    let deadline: Date | null = null;
    let invalidDeadline = false;
    let done = false;
    // tslint:disable-next-line:variable-name
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
        if (editId) {
            store.dispatch(editTodo(editId, title, deadline, hide_until_done));
            serverUpdate();
        } else {
            // tslint:disable-next-line:variable-name
            let done_time;
            if (done) {
                done_time = new Date();
            }
            store.dispatch(createTodo(title, deadline, done, done_time, new Date(), hide_until_done));
            serverUpdate();
        }
        dismiss();
    }

    function dismiss() {
        clearMessage();
        m.route.set("/", { c: context });
    }

    return {
        oninit() {
            store.dispatch(createShortcutContext());
            store.dispatch(addShortcut("Escape 000", {
                callback: dismiss,
                anywhere: true,
                preventDefault: true,
            }));
            store.dispatch(addShortcut("Enter 010", {
                callback: submit,
                anywhere: true,
                preventDefault: true,
            }));
        },

        onremove() {
            store.dispatch(popShortcutContext());
        },

        oncreate() {
            const t = document.getElementById("title");
            if (t) {
                t.focus();
            }
        },

        onbeforeremove(vnode: any) {
            vnode.dom.classList.add("modal-exit");
            return new Promise((resolve: any) => {
                vnode.dom.addEventListener("animationend", resolve);
            });
        },

        view() {
            return m("div.modal", [
                m("div.modal-shadow", {
                    onclick: dismiss,
                }),
                m("main.modal-container",
                  { class: editId ? "edit" : "create" },
                  m("form.modal-form.edit-form", {
                      autocomplete: "off",
                      onsubmit: (e: any) => {
                          e.preventDefault();
                          submit();
                      },
                  }, m("div.modal-form-contents", [
                      m("div.form-top-bar", [
                          m("h2.form-title", editId ? "EDIT" : "NEW"),
                          m("button[type=button].text-button.on-secondary", {
                              onclick: dismiss }, "Cancel"),
                      ]),
                      m("textarea.text-input#title",
                        {
                          name: "title",
                          placeholder: "Title",
                          "aria-label": "Title",
                          oninput: (e: any) => { title = e.currentTarget.value; },
                          value: title,
                          rows: 7,
                          class: (title.length > 27 || title.indexOf("\n") > -1) ? "expand" : undefined,
                      }),
                      m("input[type=text].text-input",
                        {
                          name: "deadline",
                          placeholder: "Time", "aria-label": "time",
                          oninput: (e: any) => {
                              deadlineInputText = e.currentTarget.value;
                              deadline = dateParseFunction(deadlineInputText);
                              if (deadlineInputText !== "" && deadline === null) {
                                  invalidDeadline = true;
                              } else {
                                  invalidDeadline = false;
                              }
                          },
                          value: deadlineInputText,
                      }),
                      m("h3.item-deadline.on-edit-form",
                        deadline ? formatDateTime(deadline) : (invalidDeadline ? "Invalid time" : "No time")),
                      m("div.show-in-deadlines", [
                          m("input#deadline-check[type=checkbox]", {
                              checked: !hide_until_done,
                              oninput: (e: Event) => {
                                  if (e.target && (e.target as HTMLInputElement).checked !== null) {
                                      hide_until_done = !(e.target as HTMLInputElement).checked;
                                  }
                              },
                          }),
                          m("label.css-check.on-secondary", { for: "deadline-check" }),
                          m("label.deadline-check-label", { for: "deadline-check" }, "Show in Deadlines"),
                      ]),
                      m("button[type=submit].pill-button.on-secondary.large.fill",
                        m("div.button-text", "Submit")),
                  ]))),
            ]);
        },
    };
};
