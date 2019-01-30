interface Item {
    title: string,
    deadline?: Date,
    done: boolean
}

class StateClass {
    todos: {[id: string]: Item};
    currentDate: Date;
    constructor(todos: {[id: string]: Item}, currentDate: Date) {
        this.todos = todos;
        this.currentDate = currentDate;
    }

    itemDue(id: string) {// make todo a class and put this inside
        const deadline = this.todos[id].deadline;
        if (deadline) {
            return this.currentDate > deadline;
        } else {
            return true;
        }
    }

    itemCompare(a: Item, b: Item) {// make todo a class and put this inside
        if (!b.deadline) {
            if (!a.deadline) {
                return 0;
            } else {
                return -1;
            }
        } else if (!a.deadline) {
            return 1;
        } else if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        } else {
            return 0;
        }
    }

    dueTodos() {
        return Object.keys(this.todos).filter(id => this.itemDue(id)).sort((a, b) => this.itemCompare(this.todos[a], this.todos[b]));
    }

    laterTodos() {
        return Object.keys(this.todos).filter(id => !this.itemDue(id)).sort((a, b) => this.itemCompare(this.todos[a], this.todos[b]));
    }
}

var State: StateClass = new StateClass(
    {
        "0134": {
            title: "Hand in Linear Algebra",
            deadline: new Date("2019-01-28T12:00:00.000Z"),
            done: false
        },
        "2011": {
            title: "Hand in Methods",
            deadline: new Date("2019-01-29T12:00:00.000Z"),
            done: false
        },
        "0008": {
            title: "Do laundry",
            done: false
        },
        "1000": {
            title: "Hand in Analysis",
            deadline: new Date("2019-01-30T12:00:00.000Z"),
            done: false
        },
        "0500": {
            title: "Be born",
            done: true
        }
    },
    new Date("2019-01-29T13:00:00.000Z")
)

export default State;
