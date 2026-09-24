using Serenity.Data;
using Serenity.Services;
using MyRequest = Serenity.Services.SaveRequest<DSRFQ.Master.ToolTemplateConversionRow>;
using MyResponse = Serenity.Services.SaveResponse;
using MyRow = DSRFQ.Master.ToolTemplateConversionRow;

namespace DSRFQ.Master;

public interface IToolTemplateConversionSaveHandler : ISaveHandler<MyRow, MyRequest, MyResponse> { }

public class ToolTemplateConversionSaveHandler : SaveRequestHandler<MyRow, MyRequest, MyResponse>,
    IToolTemplateConversionSaveHandler
{
    public ToolTemplateConversionSaveHandler(IRequestContext context)
        : base(context)
    {
    }

    protected override void BeforeSave()
    {
        base.BeforeSave();

        // Ticking Default has to mean "make this one the default", not "fail
        // because another row already is". Demote the incumbent here rather
        // than in AfterSave: UX_ToolTemplateConversion_Default is a unique
        // filtered index, so two rows claiming Default -- even momentarily
        // inside the transaction -- would make our own write fail.
        //
        // Default is only non-null when the client actually sent the field, so
        // an unrelated edit never disturbs the current default.
        if (Row.Default != true)
            return;

        // Compared against 1 rather than true: the underlying column is int,
        // matching the DS_ERP table this was migrated from.
        var fld = MyRow.Fields;
        var demote = new SqlUpdate(fld.TableName)
            .Set(fld.Default, false)
            .Where(new Criteria(fld.Default) == 1);

        if (IsUpdate)
            demote.Where(new Criteria(fld.Id) != Old.Id.Value);

        // ExpectedRows.Ignore, because there is usually nothing to demote.
        // SqlUpdate.Execute defaults to expecting exactly one row and throws
        // "Query affected 0 rows while 1 expected!" otherwise -- so saving the
        // only template, which is already the default, failed every time: the
        // Id != Old.Id clause excludes the very row that holds Default, leaving
        // the update matching nothing. Zero rows is the normal case here, not
        // an error.
        demote.Execute(Connection, ExpectedRows.Ignore);
    }
}
