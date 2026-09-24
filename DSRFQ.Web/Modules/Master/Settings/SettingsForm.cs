using Serenity.ComponentModel;

namespace DSRFQ.Master.Forms;

/// <summary>
/// The admin view of the ballooning settings.
/// </summary>
/// <remarks>
/// The three JSON columns are deliberately absent. They are written by the
/// widget's own dialogs - the tolerance dialog, the keyword dialog, the filter
/// dialog - where the operator can see what each value does against a real
/// drawing. Editing them as raw JSON here would be a way to write a blob that
/// parses but means nothing.
///
/// What is left is what has no other home: the datum switches, which are read
/// by the RFQ consumer rather than the browser, and the separator, which is a
/// one-character house convention.
/// </remarks>
[FormScript("Master.Settings")]
[BasedOnRow(typeof(SettingsRow), CheckNames = true)]
public class SettingsForm
{
    [Category("Datum Features")]
    public bool DatumAddMissing { get; set; }
    public decimal DatumAddMinConfidence { get; set; }

    [Category("Balloon Numbering")]
    public string SubNumberSeparator { get; set; }
}
