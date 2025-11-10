using Serenity;
using Serenity.ComponentModel;
using System;
using System.Collections.Generic;
using System.ComponentModel;

namespace DSRFQ.Common;

public partial class ColorPickerEditorAttribute : CustomEditorAttribute
{
    public const string Key = "DSRFQ.Common.ColorPickerEditor";

    public ColorPickerEditorAttribute()
        : base(Key)
    {
    }
}