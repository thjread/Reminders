import m from "mithril";
import { editTodo, addShortcut,
         createShortcutContext, popShortcutContext } from "../models/actions";
import { showMessage, clearMessage } from "../models/ui";
import { store, getTodo } from "../models/store";
import { formatDateTime } from "../utils";
import { serverUpdate } from "../models/update";

// small modal for pushing a todo's deadline later (swipe left on an item);
// same natural-language time entry as the Edit form
export default (context: string, dateParseFunction: (s: string) => Date | null, snoozeId: string) => {
    let title = "";
    let oldDeadline: Date | null = null;
    let hide_until_done = true;
    let deadlineInputText = "";
    let deadline: Date | null = null;
    let invalidDeadline = false;

    const todo = getTodo(snoozeId);
    if (todo) {
        title = todo.title;
        oldDeadline = todo.deadline || null;
        hide_until_done = todo.hide_until_done;
    } else {
        console.warn(`Todo ${snoozeId} does not exist`);
    }

    function submit() {
        if (!deadline) {
            showMessage("Please enter a valid time");
            return;
        }
        store.dispatch(editTodo(snoozeId, title, deadline, hide_until_done));
        serverUpdate();
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
            document.body.classList.remove("noscroll");
        },

        oncreate() {
            const t = document.getElementById("snooze-time");
            if (t) {
                t.focus();
            }
            document.body.classList.add("noscroll");
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
                m("main.modal-container.edit",
                  m("form.modal-form.edit-form", {
                      autocomplete: "off",
                      onsubmit: (e: any) => {
                          e.preventDefault();
                          submit();
                      },
                  }, m("div.modal-form-contents", [
                      m("div.form-top-bar", [
                          m("h2.form-title.title-font", "SNOOZE"),
                          m("button[type=button].text-button.on-secondary", {
                              onclick: dismiss }, "Cancel"),
                      ]),
                      m("h3.snooze-todo-title", title),
                      oldDeadline ?
                          m("h3.item-deadline.on-edit-form.snooze-old-time",
                            "Currently " + formatDateTime(oldDeadline)) :
                          undefined,
                      m("input[type=text].text-input#snooze-time",
                        {
                          name: "snooze-time",
                          placeholder: "New time", "aria-label": "new time",
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
                      m("button[type=submit].pill-button.on-secondary.large.fill",
                        m("div.button-text", "Snooze")),
                  ]))),
            ]);
        },
    };
};
