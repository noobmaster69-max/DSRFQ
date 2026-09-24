using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartCostingResults")]
[DisplayName("Costing Part Costing Results"), InstanceName("Costing Part Costing Results")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("CostingPartCostingResults",Permission = "?")]
public sealed class CostingPartCostingResultsRow : LoggingRow<CostingPartCostingResultsRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPart = nameof(jCostingPart);
    const string jDimensionUnit = nameof(jDimensionUnit);
    const string jCurrency = nameof(jCurrency);
    const string jMachine = nameof(jMachine);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull, ForeignKey(typeof(CostingPartsRow)), LeftJoin(jCostingPart)]
    [TextualField(nameof(CostingPartPartNumber)), LookupEditor(typeof(CostingPartsRow), Async = true)]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Costing Category Id"), Column("CostingCategoryID")]
    public int? CostingCategoryId { get => fields.CostingCategoryId[this]; set => fields.CostingCategoryId[this] = value; }

    [DisplayName("Name"), QuickSearch, NameProperty]
    public string Name { get => fields.Name[this]; set => fields.Name[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Quantity"), Size(20), Scale(4)]
    public decimal? Quantity { get => fields.Quantity[this]; set => fields.Quantity[this] = value; }

    [DisplayName("Dimension Unit"), Column("DimensionUnitID"), ForeignKey(typeof(Master.DimensionUnitsRow)), LeftJoin(jDimensionUnit)]
    [TextualField(nameof(DimensionUnitCode)), LookupEditor(typeof(Master.DimensionUnitsRow), Async = true)]
    public int? DimensionUnitId { get => fields.DimensionUnitId[this]; set => fields.DimensionUnitId[this] = value; }

    [DisplayName("Dimension Unit"), Size(100)]
    public string DimensionUnit { get => fields.DimensionUnit[this]; set => fields.DimensionUnit[this] = value; }

    [DisplayName("Unit Price"), Size(20), Scale(4)]
    public decimal? UnitPrice { get => fields.UnitPrice[this]; set => fields.UnitPrice[this] = value; }

    [DisplayName("Currency"), Column("CurrencyID"), NotNull, ForeignKey(typeof(Master.CurrenciesRow)), LeftJoin(jCurrency)]
    [TextualField(nameof(CurrencyCode)), LookupEditor(typeof(Master.CurrenciesRow), Async = true)]
    public int? CurrencyId { get => fields.CurrencyId[this]; set => fields.CurrencyId[this] = value; }

    [DisplayName("Total"), Size(20), Scale(4)]
    public decimal? Total { get => fields.Total[this]; set => fields.Total[this] = value; }

    [DisplayName("Is Time Unit"), NotNull,BooleanEditor]
    public bool? IsTimeUnit { get => fields.IsTimeUnit[this]; set => fields.IsTimeUnit[this] = value; }

    [DisplayName("Is Manual"), NotNull,BooleanEditor]
    public bool? IsManual { get => fields.IsManual[this]; set => fields.IsManual[this] = value; }

    // ---- The machine that set this line's rate -----------------------------
    //
    // Per line, not per part: a turn-mill part prices its milling rows and its
    // Turning row on two different machines. Null on rows that are not machine
    // time (material, special process).
    // See DefaultDB_20260821_1200_CostingResultMachine.
    //
    // MachineID is new_tsh's fa_supplier_equipment.id, and that table and
    // dbo.Machines are the same catalogue under the same ids -- all 38
    // equipment rows match a Machines row on both id and name, and
    // trg_AfterChange_Machines keeps them in step. So it does join, and the
    // details below come straight from dbo.Machines rather than having to be
    // copied across the database boundary.
    //
    // MachineName stays denormalised regardless: it is what the quote was
    // priced on at the time, it carries new_tsh's own wording for the
    // no-match case ("Default rates (no matching machine)"), and renaming a
    // machine later must not rewrite history on a quote already sent out.

    [DisplayName("Machine"), Size(200)]
    public string MachineName { get => fields.MachineName[this]; set => fields.MachineName[this] = value; }

    // typeof(MachinesRow), not the ("Machines", "ID") string form: [Origin]
    // resolves the joined property through the target row's type, and with the
    // string form Serenity refuses to start -- "[ForeignKey] and [LeftJoin] on
    // related join property 'MachineId' doesn't use a typeof(SomeRow)".
    [DisplayName("Machine Id"), Column("MachineID")]
    [ForeignKey(typeof(Machines.MachinesRow)), LeftJoin(jMachine)]
    public int? MachineId { get => fields.MachineId[this]; set => fields.MachineId[this] = value; }

    // Everything the workspace needs to show the machine it was costed on.
    // Joined rather than copied: unlike MachineName these are specifications,
    // not a record of the quote, so the current value is the right one.

    /// <summary>
    /// The machine's own name, e.g. "MAKINO A61NX-5XR".
    /// </summary>
    /// <remarks>
    /// Distinct from MachineName, which is new_tsh's composite label -- it
    /// packs the axis count and the work envelope into the same string
    /// ("MAKINO A61NX-5XR 3-axis 720x650x800"). That is unreadable in a table
    /// cell and duplicates values shown as their own fields, so the UI shows
    /// this and lists the specifications separately.
    /// </remarks>
    [DisplayName("Machine Name"), Origin(jMachine, nameof(Machines.MachinesRow.Name))]
    public string MachineRealName { get => fields.MachineRealName[this]; set => fields.MachineRealName[this] = value; }

    [DisplayName("Machine Picture"), Origin(jMachine, nameof(Machines.MachinesRow.Picture))]
    public string MachinePicture { get => fields.MachinePicture[this]; set => fields.MachinePicture[this] = value; }

    [DisplayName("Machine Axes"), Origin(jMachine, nameof(Machines.MachinesRow.AxisNumber))]
    public int? MachineAxisNumber { get => fields.MachineAxisNumber[this]; set => fields.MachineAxisNumber[this] = value; }

    [DisplayName("Machine Precision"), Origin(jMachine, nameof(Machines.MachinesRow.Precision))]
    public decimal? MachinePrecision { get => fields.MachinePrecision[this]; set => fields.MachinePrecision[this] = value; }

    /// <summary>Hourly rate on the machine record, for comparison with UnitPrice.</summary>
    [DisplayName("Machine Rate"), Origin(jMachine, nameof(Machines.MachinesRow.Cost))]
    public decimal? MachineCost { get => fields.MachineCost[this]; set => fields.MachineCost[this] = value; }

    [DisplayName("Machine Envelope X"), Origin(jMachine, nameof(Machines.MachinesRow.WorkEnvelopeX))]
    public decimal? MachineWorkEnvelopeX { get => fields.MachineWorkEnvelopeX[this]; set => fields.MachineWorkEnvelopeX[this] = value; }

    [DisplayName("Machine Envelope Y"), Origin(jMachine, nameof(Machines.MachinesRow.WorkEnvelopeY))]
    public decimal? MachineWorkEnvelopeY { get => fields.MachineWorkEnvelopeY[this]; set => fields.MachineWorkEnvelopeY[this] = value; }

    [DisplayName("Machine Envelope Z"), Origin(jMachine, nameof(Machines.MachinesRow.WorkEnvelopeZ))]
    public decimal? MachineWorkEnvelopeZ { get => fields.MachineWorkEnvelopeZ[this]; set => fields.MachineWorkEnvelopeZ[this] = value; }

    [DisplayName("Machine Weight Limit"), Origin(jMachine, nameof(Machines.MachinesRow.WeightLimit))]
    public decimal? MachineWeightLimit { get => fields.MachineWeightLimit[this]; set => fields.MachineWeightLimit[this] = value; }

    [DisplayName("Machine Description"), Origin(jMachine, nameof(Machines.MachinesRow.Description))]
    public string MachineDescription { get => fields.MachineDescription[this]; set => fields.MachineDescription[this] = value; }

    [DisplayName("Costing Part Part Number"), Origin(jCostingPart, nameof(CostingPartsRow.PartNumber))]
    public string CostingPartPartNumber { get => fields.CostingPartPartNumber[this]; set => fields.CostingPartPartNumber[this] = value; }

    [DisplayName("Dimension Unit Code"), Origin(jDimensionUnit, nameof(Master.DimensionUnitsRow.Code))]
    public string DimensionUnitCode { get => fields.DimensionUnitCode[this]; set => fields.DimensionUnitCode[this] = value; }

    [DisplayName("Currency Code"), Origin(jCurrency, nameof(Master.CurrenciesRow.Code)),LookupInclude]
    public string CurrencyCode { get => fields.CurrencyCode[this]; set => fields.CurrencyCode[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public StringField MachineName;
        public Int32Field MachineId;
        public StringField MachineRealName;
        public StringField MachinePicture;
        public Int32Field MachineAxisNumber;
        public DecimalField MachinePrecision;
        public DecimalField MachineCost;
        public DecimalField MachineWorkEnvelopeX;
        public DecimalField MachineWorkEnvelopeY;
        public DecimalField MachineWorkEnvelopeZ;
        public DecimalField MachineWeightLimit;
        public StringField MachineDescription;
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field CostingCategoryId;
        public StringField Name;
        public StringField Description;
        public DecimalField Quantity;
        public Int32Field DimensionUnitId;
        public StringField DimensionUnit;
        public DecimalField UnitPrice;
        public Int32Field CurrencyId;
        public DecimalField Total;
        public BooleanField IsTimeUnit;
        public BooleanField IsManual;
        

        public StringField CostingPartPartNumber;
        public StringField DimensionUnitCode;
        public StringField CurrencyCode;
    }
}