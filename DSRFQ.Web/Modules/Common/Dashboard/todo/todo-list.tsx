import { Fluent } from "@serenity-is/corelib";
import { TodoItem } from "./todo-item";
import { Todo } from "./todo-types";

export const TodoList = ({ todos }: { todos: Todo[] }) =>
    <ul class="s-todo-list" ref={ul => {
        Fluent(ul).on('change', (e: any) => {
            let li = e.target.closest('li');
            if (li) {
                li.classList.toggle('s-todo-done');
                let todo = (li as any).todo;
                todo && (todo.done = !todo.done);
            }
        });
        // @ts-ignore
        typeof Sortable !== "undefined" && Sortable.create(ul, {
            handle: ".handle"
        });
    }}>
        {todos.map(todo => <TodoItem todo={todo} />)}
    </ul>

