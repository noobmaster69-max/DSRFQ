import { faIcon } from "@serenity-is/corelib";
import { className } from "jsx-dom";
import { Todo } from "./todo-types";

const klass = (todo: Todo) => className([todo.done && "s-todo-done"]);

function todoDoneClick(e: Event) {
    var li = (e.target as Element).closest('li');
    var todo = (li as any)?.todo;
    if (todo) {
        todo.done = !todo.done;
        li.setAttribute("className", klass(todo));
    }
}

export const TodoItem = ({ todo }: { todo: Todo }) =>
    <li class={klass(todo)} {...{ todo }}>
        <span class="handle">
            <i class={faIcon("grip-vertical")}></i>
        </span>
        <input type="checkbox" class="form-check-input" value="" onChange={todoDoneClick} />
        <span class="text">{todo.text}</span>
        <small class="label"><i class={faIcon("clock")}></i> {todo.mins} mins</small>
    </li>