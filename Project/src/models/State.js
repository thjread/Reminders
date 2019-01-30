var State = {
    todos: {
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
            deadline: null,
            done: false
        },
        "1000": {
            title: "Hand in Analysis",
            deadline: new Date("2019-01-30T12:00:00.000Z"),
            done: false
        },
        "0500": {
            title: "Be born",
            deadline: null,
            done: true
        }
    },

    currentDate: new Date("2019-01-29T13:00:00.000Z"),

    isDue: function(id) {// make todo a class and put this inside
        const deadline = State.todos[id].deadline;
        return (deadline === null) || (State.currentDate > deadline);
    },

    todoCompare: function(a, b) {// make todo a class and put this inside
        if (b.deadline === null) {
            if (a.deadline === null) {
                return 0;
            } else {
                return -1;
            }
        } else if (a.deadline === null) {
            return 1;
        } else if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        } else {
            return 0;
        }
    },

    dueTodos: function() {
        return Object.keys(State.todos).filter(State.isDue).sort((a, b) => State.todoCompare(State.todos[a], State.todos[b]));
    },

    laterTodos: function() {
        return Object.keys(State.todos).filter(id => !State.isDue(id)).sort((a, b) => State.todoCompare(State.todos[a], State.todos[b]));
    }
}

module.exports = State;
