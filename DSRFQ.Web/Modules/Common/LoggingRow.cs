using DSRFQ.Administration;
using Serenity.ComponentModel;
using Serenity.Data.Mapping;
using Serenity.Data;
using System.ComponentModel;
using System;
using FluentMigrator.Runner.Generators.Base;

namespace DSRFQ {
    public abstract class LoggingRow<TFields> : Row<TFields>, ILoggingRow, IDeleteLogRow, IIsActiveDeletedRow, IIsActiveRow
       where TFields : LoggingRowFields
    {
        protected LoggingRow(TFields fields) : base(fields) { }
        protected LoggingRow() : base() { }

        [DisplayName("InsertUserId"), ForeignKey("Users", "UserId"), LeftJoin("jIUId"), TextualField(nameof(InsertBy))]
        [NotNull, Insertable(false), Updatable(true)]
        [LookupEditor(typeof(UserRow), FilterField = "IsActive", FilterValue = "1")]
        public Int32? InsertUserId
        {
            get => fields.InsertUserId[this];
            set => fields.InsertUserId[this] = value;
        }
        
        [DisplayName("Insert By"), Expression($"jIUId.DisplayName")]
        public string? InsertBy 
        {
            get => fields.InsertBy[this];
            set => fields.InsertBy[this] = value;
        }

        [DisplayName("Insert At")]
        [NotNull, Insertable(false), Updatable(false)]
        public DateTime? InsertDate
        {
            get => fields.InsertDate[this];
            set => fields.InsertDate[this] = value;
        }

        [DisplayName("UpdateUserId"), ForeignKey("Users", "UserId"), LeftJoin("jUUId"), TextualField(nameof(UpdateBy))]
        [Insertable(false), Updatable(false)]
        [LookupEditor(typeof(UserRow), FilterField = "IsActive", FilterValue = "1")]
        public Int32? UpdateUserId
        {
            get => fields.UpdateUserId[this];
            set => fields.UpdateUserId[this] = value;
        }
        
        [DisplayName("Update By"), Expression($"jUUId.DisplayName")]
        public string? UpdateBy
        {
            get => fields.UpdateBy[this];
            set => fields.UpdateBy[this] = value;
        }

        [DisplayName("Update At")]
        [Insertable(false), Updatable(false)]
        public DateTime? UpdateDate
        {
            get => fields.UpdateDate[this];
            set => fields.UpdateDate[this] = value;
        }

        [DisplayName("DeleteUserId"), ForeignKey("Users", "UserId"), LeftJoin("jDUId"), TextualField(nameof(DeleteBy))]
        [Insertable(false), Updatable(false)]
        [LookupEditor(typeof(UserRow), FilterField = "IsActive", FilterValue = "1")]
        public Int32? DeleteUserId
        {
            get => fields.DeleteUserId[this];
            set => fields.DeleteUserId[this] = value;
        }
        
        [DisplayName("Delete By"), Expression($"jDUId.DisplayName")]
        public string? DeleteBy 
        {
            get => fields.DeleteBy[this];
            set => fields.DeleteBy[this] = value;
        }


        [DisplayName("Delete At")]
        [Insertable(false), Updatable(false)]
        public DateTime? DeleteDate
        {
            get => fields.DeleteDate[this];
            set => fields.DeleteDate[this] = value;
        }

        [NotNull, Insertable(false), Updatable(true), DefaultValue(1), LookupInclude, Hidden, IntegerEditor(MinValue = -1, MaxValue = 1)]
        public Int16? IsActive
        {
            get => fields.IsActive[this];
            set => fields.IsActive[this] = value;
        }

        Field IInsertLogRow.InsertUserIdField => fields.InsertUserId;
        Field IUpdateLogRow.UpdateUserIdField => fields.UpdateUserId;
        DateTimeField IInsertLogRow.InsertDateField => fields.InsertDate;
        DateTimeField IUpdateLogRow.UpdateDateField => fields.UpdateDate;

        Field IDeleteLogRow.DeleteUserIdField => fields.DeleteUserId;
        DateTimeField IDeleteLogRow.DeleteDateField => fields.DeleteDate;

        Int16Field IIsActiveRow.IsActiveField => fields.IsActive;
    }
    
    public class LoggingRowFields : RowFieldsBase
    {
        public Int32Field    InsertUserId;
        public DateTimeField InsertDate;
        public StringField   InsertBy;
        
        public Int32Field    UpdateUserId;
        public DateTimeField UpdateDate;
        public StringField   UpdateBy;

        public Int32Field DeleteUserId;
        public DateTimeField DeleteDate;
        public StringField   DeleteBy;

        public Int16Field IsActive;

        public LoggingRowFields(string tableName = null, string fieldPrefix = null)
            : base(tableName, fieldPrefix)
        {
        }
    }
}
