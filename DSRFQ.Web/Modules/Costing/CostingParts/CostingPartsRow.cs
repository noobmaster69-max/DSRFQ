using Serenity.ComponentModel;
using Serenity.Data;
using Serenity.Data.Mapping;
using System;
using System.ComponentModel;
using DSRFQ.Company;
using DSRFQ.Master;
using DSRFQ.Modules.Common.Permissions;
using DSRFQ.Web.Modules;

namespace DSRFQ.Costing;

[ConnectionKey("Default"), Module("Costing"), TableName("CostingParts")]
[DisplayName("Drawings"), InstanceName("Drawings")]
[ReadPermission("?")]
[ModifyPermission("?")]
[ServiceLookupPermission("?")]
[NavigationPermission(DrawingPermissionKeys.Navigation)]
[LookupScript("CostingParts",Permission = "?",LookupType = typeof(MultiCompanyRowLookupScript<>))]
public sealed class CostingPartsRow : LoggingRow<CostingPartsRow.RowFields>, IIdRow, INameRow,IMultiCompanyRow
{
    
    const string jCostingPartDocumentView = nameof(jCostingPartDocumentView);
    const string jCompany = nameof(jCompany);
    const string jGroup = nameof(jGroup);
    const string jDrawingConversionStatus = nameof(jDrawingConversionStatus);
    const string jOcrStatus = nameof(jOcrStatus);
    const string jCostingStatus = nameof(jCostingStatus);
    const string jBalloonStatus = nameof(jBalloonStatus);
    const string jVolume = nameof(jVolume);
    const string jWeight = nameof(jWeight);
    
    [DisplayName("Id"), Column("ID"), Identity, IdProperty]
    public int? Id { get => fields.Id[this]; set => fields.Id[this] = value; }

    [DisplayName("Part Number"), QuickSearch, NameProperty]
    public string PartNumber { get => fields.PartNumber[this]; set => fields.PartNumber[this] = value; }

    [DisplayName("Revision")]
    public string Revision { get => fields.Revision[this]; set => fields.Revision[this] = value; }

    [DisplayName("Description")]
    public string Description { get => fields.Description[this]; set => fields.Description[this] = value; }

    [DisplayName("Length"), Size(20), Scale(4)]
    public decimal? Length { get => fields.Length[this]; set => fields.Length[this] = value; }

    [DisplayName("Width"), Size(20), Scale(4)]
    public decimal? Width { get => fields.Width[this]; set => fields.Width[this] = value; }

    [DisplayName("Height"), Size(20), Scale(4)]
    public decimal? Height { get => fields.Height[this]; set => fields.Height[this] = value; }

    [DisplayName("Dimension Unit Id"), Column("DimensionUnitID")]
    public int? DimensionUnitId { get => fields.DimensionUnitId[this]; set => fields.DimensionUnitId[this] = value; }

    [DisplayName("Part Picture")]
    public string PartPicture { get => fields.PartPicture[this]; set => fields.PartPicture[this] = value; }

    [DisplayName("Material Id"), Column("MaterialID")]
    public int? MaterialId { get => fields.MaterialId[this]; set => fields.MaterialId[this] = value; }

    [DisplayName("Material Temper Id"), Column("MaterialTemperID")]
    public int? MaterialTemperId { get => fields.MaterialTemperId[this]; set => fields.MaterialTemperId[this] = value; }

    [DisplayName("Gross Volume"), Size(20), Scale(4)]
    public decimal? GrossVolume { get => fields.GrossVolume[this]; set => fields.GrossVolume[this] = value; }

    [DisplayName("Net Volume"), Size(20), Scale(4)]
    public decimal? NetVolume { get => fields.NetVolume[this]; set => fields.NetVolume[this] = value; }

    [LookupEditor(typeof(VolumeUnitsRow),FilterField = "IsActive",FilterValue = "1")]
    [DisplayName("Volume Unit Id"), Column("VolumeUnitID"),ForeignKey("MasterVolumeUnits","ID"),LeftJoin(jVolume)]
    public int? VolumeUnitId { get => fields.VolumeUnitId[this]; set => fields.VolumeUnitId[this] = value; }

    [DisplayName("Gross Weight"), Size(20), Scale(4)]
    public decimal? GrossWeight { get => fields.GrossWeight[this]; set => fields.GrossWeight[this] = value; }

    [DisplayName("Net Weight"), Size(20), Scale(4)]
    public decimal? NetWeight { get => fields.NetWeight[this]; set => fields.NetWeight[this] = value; }

    [LookupEditor(typeof(WeightUnitsRow),FilterField = "IsActive",FilterValue = "1")]
    [DisplayName("Weight Unit Id"), Column("WeightUnitID"),ForeignKey("MasterWeightUnits","ID"),LeftJoin(jWeight)]
    public int? WeightUnitId { get => fields.WeightUnitId[this]; set => fields.WeightUnitId[this] = value; }
    
    [DisplayName("Number Of Face")]
    public int? NumberOfFace { get => fields.NumberOfFace[this]; set => fields.NumberOfFace[this] = value; }

    [DisplayName("Number Of Hole")]
    public int? NumberOfHole { get => fields.NumberOfHole[this]; set => fields.NumberOfHole[this] = value; }

    [DisplayName("Costing Part Document View"),Expression($"T0.ID"),ForeignKey("CostingPartDocumentView","CostingPartID"),LeftJoin(jCostingPartDocumentView)]
    public int? CostingPartDocumentView
    {
        get => fields.CostingPartDocumentView[this];
        set => fields.CostingPartDocumentView[this] = value;
    }
    [DisplayName("Document List"),Expression($"{jCostingPartDocumentView}.[DocumentList]"),LookupInclude]
    public string DocumentList
    {
        get => fields.DocumentList[this];
        set => fields.DocumentList[this] = value;
    }
    [LookupEditor(typeof(CompaniesRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(Administration.PermissionKeys.Company)]
    [DisplayName("Company"), Column("CompanyID"), LookupInclude, ForeignKey("Companies", "ID"), LeftJoin(jCompany), TextualField(nameof(CompanyName))]
    public int? CompanyId
    {
        get => fields.CompanyId[this];
        set => fields.CompanyId[this] = value;
    }
    [DisplayName("Company"),Expression($"{jCompany}.[Name]"),LookupInclude]
    public string CompanyName
    {
        get => fields.CompanyName[this];
        set => fields.CompanyName[this] = value;
    }
    [LookupEditor(typeof(GroupsRow),FilterField = "IsActive",FilterValue = "1")]
    [ReadPermission(Administration.PermissionKeys.Group)]
    [DisplayName("Group"), Column("GroupID"), LookupInclude, ForeignKey("Groups", "ID"), LeftJoin(jGroup), TextualField(nameof(GroupName))]
    public int? GroupId
    {
        get => fields.GroupId[this];
        set => fields.GroupId[this] = value;
    }
    [DisplayName("Group"),Expression($"{jGroup}.[Name]"),LookupInclude]
    public string GroupName
    {
        get => fields.GroupName[this];
        set => fields.GroupName[this] = value;
    }
    public Int32Field CompanyIdField { get => Fields.CompanyId; }
    public Int32Field GroupIdField { get => Fields.GroupId; }

    [DisplayName("Drawing Conversion Status"),LookupInclude,Column("DrawingConversionStatusID"),ForeignKey("MasterCostingStatus","ID"),LeftJoin(jDrawingConversionStatus),LookupEditor(typeof(CostingStatusRow),FilterField = "IsActive",FilterValue = "1")]
    
    public int? DrawingConversionStatusId
    {
        get => fields.DrawingConversionStatusId[this];
        set => fields.DrawingConversionStatusId[this] = value;
    }
    [DisplayName("Drawing Conversion Status"),Expression($"{jDrawingConversionStatus}.[Name]"),LookupInclude]

    public string DrawingConversionStatusName
    {
        get => fields.DrawingConversionStatusName[this];
        set => fields.DrawingConversionStatusName[this] = value;
    }
    [DisplayName("Drawing Conversion Status"),Expression($"{jDrawingConversionStatus}.[Color]"),LookupInclude]
    public string DrawingConversionStatusColor
    {
        get => fields.DrawingConversionStatusColor[this];
        set => fields.DrawingConversionStatusColor[this] = value;
    } 
    
    [DisplayName("OCR Status"),LookupInclude,Column("OcrStatusID"),ForeignKey("MasterCostingStatus","ID"),LeftJoin(jOcrStatus),LookupEditor(typeof(CostingStatusRow),FilterField = "IsActive",FilterValue = "1")]
    
    public int? OcrStatusId
    {
        get => fields.OcrStatusId[this];
        set => fields.OcrStatusId[this] = value;
    }
    [DisplayName("OCR Status"),Expression($"{jOcrStatus}.[Name]"),LookupInclude]

    public string OcrStatusName
    {
        get => fields.OcrStatusName[this];
        set => fields.OcrStatusName[this] = value;
    }
    [DisplayName("OCR Status"),Expression($"{jOcrStatus}.[Color]"),LookupInclude]
    public string OcrStatusColor
    {
        get => fields.OcrStatusColor[this];
        set => fields.OcrStatusColor[this] = value;
    } 
    
    [DisplayName("Costing Status"),LookupInclude,Column("CostingStatusID"),ForeignKey("MasterCostingStatus","ID"),LeftJoin(jCostingStatus),LookupEditor(typeof(CostingStatusRow),FilterField = "IsActive",FilterValue = "1")]
    
    public int? CostingStatusId
    {
        get => fields.CostingStatusId[this];
        set => fields.CostingStatusId[this] = value;
    }
    [DisplayName("Costing Status"),Expression($"{jCostingStatus}.[Name]"),LookupInclude]

    public string CostingStatusName
    {
        get => fields.CostingStatusName[this];
        set => fields.CostingStatusName[this] = value;
    }
    [DisplayName("Costing Status"),Expression($"{jCostingStatus}.[Color]"),LookupInclude]
    public string CostingStatusColor
    {
        get => fields.CostingStatusColor[this];
        set => fields.CostingStatusColor[this] = value;
    } 
    
    [DisplayName("Balloon Status"),LookupInclude,Column("BalloonStatusID"),ForeignKey("MasterCostingStatus","ID"),LeftJoin(jBalloonStatus),LookupEditor(typeof(CostingStatusRow),FilterField = "IsActive",FilterValue = "1")]
    
    public int? BalloonStatusId
    {
        get => fields.BalloonStatusId[this];
        set => fields.BalloonStatusId[this] = value;
    }
    [DisplayName("Ballooning Status"),Expression($"{jBalloonStatus}.[Name]"),LookupInclude]

    public string BalloonStatusName
    {
        get => fields.BalloonStatusName[this];
        set => fields.BalloonStatusName[this] = value;
    }
    [DisplayName("Ballooning Status"),Expression($"{jBalloonStatus}.[Color]"),LookupInclude]
    public string BalloonStatusColor
    {
        get => fields.BalloonStatusColor[this];
        set => fields.BalloonStatusColor[this] = value;
    } 
    [DisplayName("Customer"),Column("CustomerName"),LookupInclude]
    public string CustomerName
    {
        get => fields.CustomerName[this];
        set => fields.CustomerName[this] = value;
    }
    [DisplayName("Uom"),Column("Uom"),LookupInclude]
    public string Uom
    {
        get => fields.Uom[this];
        set => fields.Uom[this] = value;
    }
    [DisplayName("Material"),Column("Material"),LookupInclude]
    public string Material
    {
        get => fields.Material[this];
        set => fields.Material[this] = value;
    }
    [DisplayName("Volume Unit"),Expression($"{jVolume}.[Code]"),LookupInclude]
    public string VolumeUnitCode
    {
        get=>fields.VolumeUnitCode[this];
        set => fields.VolumeUnitCode[this] = value;
    }
    [DisplayName("Weight Unit"),Expression($"{jWeight}.[Code]"),LookupInclude]
    public string WeightUnitCode
    {
        get=>fields.WeightUnitCode[this];
        set => fields.WeightUnitCode[this] = value;
    }
    [DisplayName("Volume Unit"),Column("VolumeUnit")]
    public string VolumeUnit
    {
        get => fields.VolumeUnit[this];
        set => fields.VolumeUnit[this] = value;
    }
    [DisplayName("Weight Unit"),Column("WeightUnit")]
    public string WeightUnit
    {
        get => fields.WeightUnit[this];
        set => fields.WeightUnit[this] = value;
    }
    [DisplayName("Message"),NotMapped]
    public string Message
    {
        get => fields.Message[this];
        set => fields.Message[this] = value;
    }
    public class RowFields : LoggingRowFields
    {
        public Int32Field Id;
        public StringField PartNumber;
        public StringField Revision;
        public StringField Description;
        public DecimalField Length;
        public DecimalField Width;
        public DecimalField Height;
        public Int32Field DimensionUnitId;
        public StringField PartPicture;
        public Int32Field MaterialId;
        public Int32Field MaterialTemperId;
        public DecimalField GrossVolume;
        public DecimalField NetVolume;
        public Int32Field VolumeUnitId;
        public StringField VolumeUnit;
        public StringField VolumeUnitCode;
        public DecimalField GrossWeight;
        public DecimalField NetWeight;
        public Int32Field WeightUnitId;
        public StringField WeightUnit;
        public StringField WeightUnitCode;
        public Int32Field NumberOfFace;
        public Int32Field NumberOfHole;
        
        public Int32Field CostingPartDocumentView;
        public StringField DocumentList;
        public Int32Field CompanyId;
        public StringField CompanyName;
        public Int32Field GroupId;
        public StringField GroupName;

        public Int32Field DrawingConversionStatusId;
        public StringField DrawingConversionStatusName;
        public StringField DrawingConversionStatusColor;
        
        public Int32Field OcrStatusId;
        public StringField OcrStatusName;
        public StringField OcrStatusColor;
        
        public Int32Field CostingStatusId;
        public StringField CostingStatusName;
        public StringField CostingStatusColor;
        
        public Int32Field BalloonStatusId;
        public StringField BalloonStatusName;
        public StringField BalloonStatusColor;

        public StringField CustomerName;
        public StringField Uom;
        public StringField Material;
        
        public StringField Message;
    }
}