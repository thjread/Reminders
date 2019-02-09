import { store } from "./store";
import { setModal } from "./actions";
import Edit from "../views/Edit";

export function create() {
    store.dispatch(setModal(Edit()));
}

export function edit(id: string) {
    store.dispatch(setModal(Edit(id)));
}
