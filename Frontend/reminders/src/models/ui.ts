import { store } from "./store";
import { setModal } from "./actions";
import Edit from "../views/Edit";

export function create() {
    store.dispatch(setModal(Edit()));
}
