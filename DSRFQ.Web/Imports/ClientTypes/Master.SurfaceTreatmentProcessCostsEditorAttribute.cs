using Serenity;
using Serenity.ComponentModel;
using System;
using System.Collections.Generic;
using System.ComponentModel;

namespace DSRFQ.Master;

public partial class SurfaceTreatmentProcessCostsEditorAttribute : CustomEditorAttribute
{
    public const string Key = "DSRFQ.Master.SurfaceTreatmentProcessCostsEditor";

    public SurfaceTreatmentProcessCostsEditorAttribute()
        : base(Key)
    {
    }
}