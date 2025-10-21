using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingPartDocumentImages")]
[DisplayName("Costing Part Document Images"), InstanceName("Costing Part Document Images")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[LookupScript("CostingPartDocumentImages",Permission = "?")]
public sealed class CostingPartDocumentImagesRow : LoggingRow<CostingPartDocumentImagesRow.RowFields>, IIdRow, INameRow
{
    const string jCostingPartDocument = nameof(jCostingPartDocument);

    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Costing Part Document"), Column("CostingPartDocumentID"), NotNull, ForeignKey(typeof(CostingPartDocumentsRow))]
    [LeftJoin(jCostingPartDocument), TextualField(nameof(CostingPartDocumentFileDirectory))]
    [LookupEditor(typeof(CostingPartDocumentsRow), Async = true)]
    public int? CostingPartDocumentId { get => fields.CostingPartDocumentId[this]; set => fields.CostingPartDocumentId[this] = value; }

    [DisplayName("File Directory"), QuickSearch, NameProperty]
    public string FileDirectory { get => fields.FileDirectory[this]; set => fields.FileDirectory[this] = value; }

    [DisplayName("File Name")]
    public string FileName { get => fields.FileName[this]; set => fields.FileName[this] = value; }

    [DisplayName("Page")]
    public int? Page { get => fields.Page[this]; set => fields.Page[this] = value; }

   

    [DisplayName("Costing Part Document File Directory"), Origin(jCostingPartDocument, nameof(CostingPartDocumentsRow.FileDirectory))]
    public string CostingPartDocumentFileDirectory { get => fields.CostingPartDocumentFileDirectory[this]; set => fields.CostingPartDocumentFileDirectory[this] = value; }

    [DisplayName("Original"),BooleanEditor]
    public bool? Original
    {
        get => fields.Original[this];
        set => fields.Original[this] = value;
    }
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public Int32Field CostingPartDocumentId;
        public StringField FileDirectory;
        public StringField FileName;
        public Int32Field Page;
    

        public StringField CostingPartDocumentFileDirectory;
        public BooleanField Original;

    }
}