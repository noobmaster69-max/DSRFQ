using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Master;

[ConnectionKey("Default"), Module("Master"), TableName("MasterSurfaceTreatmentProcessCosts")]
[DisplayName("Surface Treatment Process Costs"), InstanceName("Surface Treatment Process Costs")]
[ReadPermission("?")]
[InsertPermission("?")]
[UpdatePermission("?")]
[DeletePermission("?")]
[NavigationPermission("?")]

[ServiceLookupPermission("?")]

[LookupScript("MasterSurfaceTreatmentProcessCosts",Permission = "?")]
public sealed class SurfaceTreatmentProcessCostsRow : LoggingRow<SurfaceTreatmentProcessCostsRow.RowFields>, IIdRow
{
    const string jSurfaceTreatmentProcess = nameof(jSurfaceTreatmentProcess);
    const string jDimensionUnit = nameof(jDimensionUnit);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Surface Treatment Process"), Column("SurfaceTreatmentProcessID"), NotNull]
    [ForeignKey(typeof(SurfaceTreatmentProcessesRow)), LeftJoin(jSurfaceTreatmentProcess)]
    [TextualField(nameof(SurfaceTreatmentProcessName)), ServiceLookupEditor(typeof(SurfaceTreatmentProcessesRow))]
    public int? SurfaceTreatmentProcessId { get => fields.SurfaceTreatmentProcessId[this]; set => fields.SurfaceTreatmentProcessId[this] = value; }

    [DisplayName("Dimension Unit"), Column("DimensionUnitID"), NotNull, ForeignKey(typeof(DimensionUnitsRow)), LeftJoin(jDimensionUnit)]
    [TextualField(nameof(DimensionUnitCode)), LookupEditor(typeof(DimensionUnitsRow), Async = true)]
    public int? DimensionUnitId { get => fields.DimensionUnitId[this]; set => fields.DimensionUnitId[this] = value; }

    [DisplayName("Price Per Unit Area"), Size(20), Scale(4), NotNull]
    public decimal? PricePerUnitArea { get => fields.PricePerUnitArea[this]; set => fields.PricePerUnitArea[this] = value; }

    [DisplayName("Default"), NotNull]
    public bool? Default { get => fields.Default[this]; set => fields.Default[this] = value; }

    

    [DisplayName("Surface Treatment Process Name"), Origin(jSurfaceTreatmentProcess, nameof(SurfaceTreatmentProcessesRow.Name)),LookupInclude]
    public string SurfaceTreatmentProcessName { get => fields.SurfaceTreatmentProcessName[this]; set => fields.SurfaceTreatmentProcessName[this] = value; }

    [DisplayName("Dimension Unit Code"), Origin(jDimensionUnit, nameof(DimensionUnitsRow.Code)),LookupInclude]
    public string DimensionUnitCode { get => fields.DimensionUnitCode[this]; set => fields.DimensionUnitCode[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field SurfaceTreatmentProcessId;
        public Int32Field DimensionUnitId;
        public DecimalField PricePerUnitArea;
        public BooleanField Default;
       

        public StringField SurfaceTreatmentProcessName;
        public StringField DimensionUnitCode;
    }
}