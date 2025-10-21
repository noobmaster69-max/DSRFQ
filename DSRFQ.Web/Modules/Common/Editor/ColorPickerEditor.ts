import { Decorators, IGetEditValue, ISetEditValue, Widget } from "@serenity-is/corelib";

@Decorators.element("<div style='display: flex; align-items:center;' />")
@Decorators.registerEditor("DSRFQ.Common.ColorPickerEditor")
export class ColorPickerEditor extends Widget<any>
    implements IGetEditValue, ISetEditValue {

    private inputEl: HTMLInputElement;
    private previewEl: HTMLSpanElement;

    constructor(container) {
        super(container);

        this.updateElementContent();
    }

    private updateElementContent() {
        // create <input type="color">
        this.inputEl = document.createElement("input");
        this.inputEl.type = "color";
        this.inputEl.classList.add("editor", "flexify");
        this.inputEl.id = `clpkr${this.uniqueName}`;

        // preview box
        this.previewEl = document.createElement("span");
        this.previewEl.classList.add("inplace-button", "input-group-addon");
        this.previewEl.style.cssText = "width: 24px; height: 24px; border-radius: 4px; margin-left: 6px; display:inline-block;";

        // bind change event to update preview color
        this.inputEl.addEventListener("input", () => {
            this.previewEl.style.backgroundColor = this.inputEl.value;
        });

        // append to container
        this.element[0].appendChild(this.inputEl);
        this.element[0].appendChild(this.previewEl);
    }

    public get value(): string {
        return this.inputEl.value;
    }

    public set value(value: string) {
        if (value !== undefined && value !== null) {
            this.inputEl.value = value;
            this.previewEl.style.backgroundColor = value;
        }
    }

    public getEditValue(property, target) {
        target[property.name] = this.value;
    }

    public setEditValue(source, property) {
        this.value = source[property.name];
    }
}
