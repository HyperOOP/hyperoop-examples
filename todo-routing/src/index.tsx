import * as ui from "hyperoop";
import { Router, Link, JSXFactory } from "hyperoop-router";

import "./index.scss";

type FilterName = "All" | "Todo" | "Done";

const Filters: {[name in FilterName]: (Item) => boolean} = {
    All:  () => true,
    Done: (it) => it.State.done,
    Todo: (it) => !it.State.done,
};

interface ITodoState {
    todos:       Item[];
    filter:      FilterName;
    input:       string;
    placeholder: string;
}

class Todo extends ui.Actions<ITodoState> {
    readonly Router: Router;

    constructor(start: ITodoState) {
        super(start);
        this.Router = new Router(this, ui.h as JSXFactory); // TODO: fix types
    }
   
    get Filtered(): Item[] {
        return this.State.todos.filter(Filters[this.State.filter]);
    }

    get UnusedFilters(): FilterName[] {
        return (Object.keys(Filters) as FilterName[])
            .filter((key) => key !== todo.State.filter);
    }

    public onPathChange(data: any) {
        const d = `${data}`;
        if (d in Filters) {
            this.State.filter = d as FilterName;
        } else {
            this.State.filter = "All";
        }
    }

    public add() {
        const newItem = new Item({
            done:  false,
            id:    this.State.todos.length + 1,
            value: this.State.input,
        }, this);

        this.set({
            input: "",
            todos: [...this.State.todos, newItem],
        });
    }
}

const todo = new Todo({
    filter:      "All",
    input:       "",
    placeholder: "Do that thing...",
    todos:       [],
});

interface IItemState {
    id:    number;
    done:  boolean;
    value: string;
}

class Item extends ui.SubActions<IItemState> {}

const TodoItem = ({ item }: { item: Item }) => (
    <li
        class = {item.State.done && "done"}
        onclick = {() => item.State.done = !item.State.done}
    >
        { item.State.value }
    </li>
);

const FilterButton = ({ filter }: { filter: FilterName }) => (
    <span>
        <Link to = {{hash: filter, state: filter}}>
            {filter}
        </Link>
        {" "}
    </span>
);

const view = () => (
    <div>
        <h1>Todo</h1>
        <p>{todo.UnusedFilters.map((key) => <FilterButton filter={key}/>)}</p>

        <div class = "flex">
            <input
                type        = "text"
                onkeyup     = {(e) => (e.keyCode === 13 ? todo.add() : "")}
                oninput     = {(e) => todo.State.input = e.target.value}
                value       = {todo.State.input}
                placeholder = {todo.State.placeholder}
            />
            <button onclick = {() => todo.add()}>＋</button>
        </div>

        <p>
            <ul> {todo.Filtered.map((t) => <TodoItem item={t}/>)} </ul>
        </p>
  </div>
);

ui.init(document.body, view, todo);    
