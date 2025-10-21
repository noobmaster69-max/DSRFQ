import { TodoItem } from "./todo-item";
import { TodoList } from "./todo-list";
import { todoData } from "./todo-mock-data";

export const TodoCard = ({ }) => {
    let ul = <TodoList todos={todoData} />;
    let input: HTMLInputElement;
    return <div class="card s-dashboard-card s-dashboard-todo">
        <div class="card-header pb-0">
            <h3 class="card-title">Tasks</h3>
        </div>
        <div class="card-body">
            {ul}
        </div>
        <div class="card-footer pt-0">
            <div class="input-group">
                <input type="text" class="form-control" placeholder="type another task" ref={el => input = el} />
                <button class="btn btn-primary" onClick={e => {
                    var text = input.value?.trim();
                    if (text?.length) {
                        input.value = '';
                        input.focus();
                        ul.append(<TodoItem todo={{
                            text,
                            mins: (Math.trunc(Math.random() * 10) + 1) * 5
                        }} />);
                    }
                }}>Add</button>
            </div>
        </div>
    </div>
}