using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

/// <summary>
/// One machine that could run one costing process, and what it would cost.
/// </summary>
/// <remarks>
/// See DefaultDB_20260821_1700_CostingMachineOptions for why these are stored
/// rather than trusting the single machine new_tsh reports.
/// </remarks>
[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartMachineOptions")]
[DisplayName("Machine Options"), InstanceName("Machine Option")]
[ReadPermission("?")]
[ModifyPermission("?")]
public sealed class CostingPartMachineOptionsRow : LoggingRow<CostingPartMachineOptionsRow.RowFields>,
    IIdRow, INameRow
{
    const string jMachine = nameof(jMachine);
    const string jLine = nameof(jLine);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Part"), Column("CostingPartID"), NotNull]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Cost Line"), Column("CostingPartCostingResultID"), NotNull]
    [ForeignKey(typeof(CostingPartCostingResultsRow)), LeftJoin(jLine)]
    public int? CostingPartCostingResultId { get => fields.CostingPartCostingResultId[this]; set => fields.CostingPartCostingResultId[this] = value; }

    [DisplayName("Machine"), Column("MachineID"), NotNull]
    [ForeignKey(typeof(Machines.MachinesRow)), LeftJoin(jMachine)]
    public int? MachineId { get => fields.MachineId[this]; set => fields.MachineId[this] = value; }

    [DisplayName("Hourly Rate"), Size(18), Scale(4)]
    public decimal? HourlyRate { get => fields.HourlyRate[this]; set => fields.HourlyRate[this] = value; }

    [DisplayName("Currency Id"), Column("CurrencyID")]
    public int? CurrencyId { get => fields.CurrencyId[this]; set => fields.CurrencyId[this] = value; }

    [DisplayName("Line Total"), Size(18), Scale(4)]
    public decimal? LineTotal { get => fields.LineTotal[this]; set => fields.LineTotal[this] = value; }

    [DisplayName("Selected")]
    public short? IsSelected { get => fields.IsSelected[this]; set => fields.IsSelected[this] = value; }

    [DisplayName("Recommended")]
    public short? IsRecommended { get => fields.IsRecommended[this]; set => fields.IsRecommended[this] = value; }

    [DisplayName("Chosen By User")]
    public short? IsUserChoice { get => fields.IsUserChoice[this]; set => fields.IsUserChoice[this] = value; }

    [DisplayName("Fits Envelope")]
    public short? FitsEnvelope { get => fields.FitsEnvelope[this]; set => fields.FitsEnvelope[this] = value; }

    [DisplayName("Fits Weight")]
    public short? FitsWeight { get => fields.FitsWeight[this]; set => fields.FitsWeight[this] = value; }

    [DisplayName("Axis Sufficient")]
    public short? AxisSufficient { get => fields.AxisSufficient[this]; set => fields.AxisSufficient[this] = value; }

    // ── From dbo.Machines, so the picker can show the machine ───────────────

    [DisplayName("Machine Name"), Origin(jMachine, nameof(Machines.MachinesRow.Name)), NameProperty]
    public string MachineName { get => fields.MachineName[this]; set => fields.MachineName[this] = value; }

    [DisplayName("Machine Picture"), Origin(jMachine, nameof(Machines.MachinesRow.Picture))]
    public string MachinePicture { get => fields.MachinePicture[this]; set => fields.MachinePicture[this] = value; }

    [DisplayName("Axes"), Origin(jMachine, nameof(Machines.MachinesRow.AxisNumber))]
    public int? MachineAxisNumber { get => fields.MachineAxisNumber[this]; set => fields.MachineAxisNumber[this] = value; }

    [DisplayName("Precision"), Origin(jMachine, nameof(Machines.MachinesRow.Precision))]
    public decimal? MachinePrecision { get => fields.MachinePrecision[this]; set => fields.MachinePrecision[this] = value; }

    [DisplayName("Envelope X"), Origin(jMachine, nameof(Machines.MachinesRow.WorkEnvelopeX))]
    public decimal? MachineWorkEnvelopeX { get => fields.MachineWorkEnvelopeX[this]; set => fields.MachineWorkEnvelopeX[this] = value; }

    [DisplayName("Envelope Y"), Origin(jMachine, nameof(Machines.MachinesRow.WorkEnvelopeY))]
    public decimal? MachineWorkEnvelopeY { get => fields.MachineWorkEnvelopeY[this]; set => fields.MachineWorkEnvelopeY[this] = value; }

    [DisplayName("Envelope Z"), Origin(jMachine, nameof(Machines.MachinesRow.WorkEnvelopeZ))]
    public decimal? MachineWorkEnvelopeZ { get => fields.MachineWorkEnvelopeZ[this]; set => fields.MachineWorkEnvelopeZ[this] = value; }

    [DisplayName("Weight Limit"), Origin(jMachine, nameof(Machines.MachinesRow.WeightLimit))]
    public decimal? MachineWeightLimit { get => fields.MachineWeightLimit[this]; set => fields.MachineWeightLimit[this] = value; }

    /// <summary>The process this option belongs to, e.g. "Milling Roughing".</summary>
    [DisplayName("Process"), Origin(jLine, nameof(CostingPartCostingResultsRow.Name))]
    public string ProcessName { get => fields.ProcessName[this]; set => fields.ProcessName[this] = value; }

    /// <summary>Hours on the line, so the UI can show hours x rate.</summary>
    [DisplayName("Hours"), Origin(jLine, nameof(CostingPartCostingResultsRow.Quantity))]
    public decimal? ProcessHours { get => fields.ProcessHours[this]; set => fields.ProcessHours[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public Int32Field CostingPartCostingResultId;
        public Int32Field MachineId;
        public DecimalField HourlyRate;
        public Int32Field CurrencyId;
        public DecimalField LineTotal;
        public Int16Field IsSelected;
        public Int16Field IsRecommended;
        public Int16Field IsUserChoice;
        public Int16Field FitsEnvelope;
        public Int16Field FitsWeight;
        public Int16Field AxisSufficient;

        public StringField MachineName;
        public StringField MachinePicture;
        public Int32Field MachineAxisNumber;
        public DecimalField MachinePrecision;
        public DecimalField MachineWorkEnvelopeX;
        public DecimalField MachineWorkEnvelopeY;
        public DecimalField MachineWorkEnvelopeZ;
        public DecimalField MachineWeightLimit;

        public StringField ProcessName;
        public DecimalField ProcessHours;
    }
}
