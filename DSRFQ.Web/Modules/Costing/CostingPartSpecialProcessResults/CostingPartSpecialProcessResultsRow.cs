using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartSpecialProcessResults")]
[DisplayName("Costing Part Special Process Results"), InstanceName("Costing Part Special Process Results")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("CostingPartSpecialProcessResults",Permission = "?")]
public sealed class CostingPartSpecialProcessResultsRow : LoggingRow<CostingPartSpecialProcessResultsRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPart = nameof(jCostingPart);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull, ForeignKey(typeof(CostingPartsRow)), LeftJoin(jCostingPart)]
    [TextualField(nameof(CostingPartPartNumber)), LookupEditor(typeof(CostingPartsRow), Async = true)]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("Special Process Name"), QuickSearch, NameProperty]
    public string SpecialProcessName { get => fields.SpecialProcessName[this]; set => fields.SpecialProcessName[this] = value; }

    [DisplayName("Special Process Id"), Column("SpecialProcessID")]
    public int? SpecialProcessId { get => fields.SpecialProcessId[this]; set => fields.SpecialProcessId[this] = value; }

    [DisplayName("Is Manual"), NotNull,BooleanEditor]
    public bool? IsManual { get => fields.IsManual[this]; set => fields.IsManual[this] = value; }

    

    [DisplayName("Costing Part Part Number"), Origin(jCostingPart, nameof(CostingPartsRow.PartNumber))]
    public string CostingPartPartNumber { get => fields.CostingPartPartNumber[this]; set => fields.CostingPartPartNumber[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public StringField SpecialProcessName;
        public Int32Field SpecialProcessId;
        public BooleanField IsManual;
      

        public StringField CostingPartPartNumber;
    }
}