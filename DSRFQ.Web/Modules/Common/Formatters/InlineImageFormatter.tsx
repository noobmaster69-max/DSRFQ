import { Decorators, Formatter, IInitializeColumn, resolveUrl } from "@serenity-is/corelib";
import { Column, FormatterContext, FormatterResult } from "@serenity-is/sleekgrid";
import { ImageDialog } from "@/Common/Dialog/ImageDialog";

export interface InlineImageFormatterProps {
    /** Row field holding the file name, when it is not the column's own value. */
    fileProperty?: string;
    /** Show the `_t.jpg` thumbnail in the cell, but open the full size image. */
    thumb?: boolean;
}

@Decorators.registerFormatter("DSRFQ.Common.InlineImageFormatter", [IInitializeColumn])
export class InlineImageFormatter implements Formatter, IInitializeColumn {

    constructor(public readonly props: InlineImageFormatterProps = {}) {
        this.props ??= {};
    }

    format(ctx: FormatterContext): FormatterResult {
        let file = (this.fileProperty ? ctx.item[this.fileProperty] : ctx.value) as string;
        if (!file || !file.length)
            return "";

        // Stored values may be absolute Windows paths from the upload folder.
        file = file.replace(/.*\\upload\\/, "").replace(/\\/g, "/");

        const isAbsolute = /^(https?:)?\/\//i.test(file);
        const href = isAbsolute ? file : resolveUrl("~/upload/" + file);

        let src = href;
        if (!isAbsolute && this.thumb) {
            const parts = file.split('.');
            src = resolveUrl("~/upload/" + parts.slice(0, parts.length - 1).join('.') + "_t.jpg");
        }

        // An element rather than markup: the click handler has to survive the
        // grid writing the result into the cell.
        return <img class="inline-image-formatter" src={src} alt=""
            onClick={() => new ImageDialog({ imageUrl: href }).dialogOpen()} />;
    }

    initializeColumn(column: Column): void {
        if (this.fileProperty) {
            column.referencedFields = column.referencedFields || [];
            column.referencedFields.push(this.fileProperty);
        }
    }

    @Decorators.option()
    get fileProperty() { return this.props.fileProperty; }
    set fileProperty(value: string) { this.props.fileProperty = value; }

    @Decorators.option()
    get thumb() { return this.props.thumb; }
    set thumb(value: boolean) { this.props.thumb = value; }
}
