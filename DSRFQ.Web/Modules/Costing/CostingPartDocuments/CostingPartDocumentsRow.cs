using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartDocuments")]
[DisplayName("Costing Part Documents"), InstanceName("Costing Part Documents")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("CostingPartDocuments",Permission = "?")]
public sealed class CostingPartDocumentsRow : LoggingRow<CostingPartDocumentsRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPart = nameof(jCostingPart);
    

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part"), Column("CostingPartID"), NotNull, ForeignKey(typeof(CostingPartsRow)), LeftJoin(jCostingPart)]
    [TextualField(nameof(CostingPartPartNumber)), ServiceLookupEditor(typeof(CostingPartsRow))]
    public int? CostingPartId { get => fields.CostingPartId[this]; set => fields.CostingPartId[this] = value; }

    [DisplayName("File Directory"), QuickSearch, FileUploadEditor(FilenameFormat = "Drawing/|CostingPartId|/{4}")]
    public string FileDirectory { get => fields.FileDirectory[this]; set => fields.FileDirectory[this] = value; }
    [DisplayName("Converted File Directory"), QuickSearch]
    public string ConvertedFileDirectory { get => fields.ConvertedFileDirectory[this]; set => fields.ConvertedFileDirectory[this] = value; }

    [DisplayName("File Name"),NameProperty]
    public string FileName { get => fields.FileName[this]; set => fields.FileName[this] = value; }

    [DisplayName("Type")]
    public int? Type { get => fields.Type[this]; set => fields.Type[this] = value; }

   

    [DisplayName("Costing Part Part Number"), Origin(jCostingPart, nameof(CostingPartsRow.PartNumber))]
    public string CostingPartPartNumber { get => fields.CostingPartPartNumber[this]; set => fields.CostingPartPartNumber[this] = value; }

    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartId;
        public StringField FileDirectory;
        public StringField ConvertedFileDirectory;
        public StringField FileName;
        public Int32Field Type;
        

        public StringField CostingPartPartNumber;
    }
}