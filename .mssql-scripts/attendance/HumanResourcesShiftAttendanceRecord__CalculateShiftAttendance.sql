
CREATE TRIGGER [dbo].[CalculateShiftAttendance]
   ON  [dbo].[HumanResourcesShiftAttendanceRecord]
   AFTER UPDATE
                              AS
BEGIN

    SET NOCOUNT ON
    DECLARE @cursor CURSOR
    DECLARE @Id int
    DECLARE @ShiftId int
    DECLARE @ShiftDate date
    declare @DayIndex int 
    declare @EmployeeRowId int
    DECLARE @TodayStartTime nvarchar(MAX),@TodayEndTime nvarchar(MAX),@TodayWorkingTime int, @TodayNightShift int;
	DECLARE @TodayBreakTimeStart nvarchar(MAX),@TodayBreakTimeEnd nvarchar(MAX);
    DECLARE @ShiftStartTime datetime, @ShiftEndTime datetime
    declare @SessionToday int = 0 ;
    SET @cursor = Cursor for select Id,EmployeeRowId, ShiftId,ShiftDate,ShiftStartTime,ShiftEndTime FROM inserted  
    open @cursor
    fetch next from @cursor into @Id,@EmployeeRowId,@ShiftId,@ShiftDate, @ShiftStartTime, @ShiftEndTime
    WHILE @@FETCH_STATUS =0 BEGIN
        set @DayIndex  = DATEPART(WEEKDAY, @ShiftDate);
		SELECT
            @TodayWorkingTime = CASE @DayIndex
                                    WHEN 1 THEN SundayWorkingTime
                                    WHEN 2 THEN MondayWorkingTime
                                    WHEN 3 THEN TuesdayWorkingTime
                                    WHEN 4 THEN WednesdayWorkingTime
                                    WHEN 5 THEN ThursdayWorkingTime
                                    WHEN 6 THEN FridayWorkingTime
                                    WHEN 7 THEN SaturdayWorkingTime
                END,
            @TodayStartTime = CASE @DayIndex
                                  WHEN 1 THEN SundayStartingFrom
                                  WHEN 2 THEN MondayStartingFrom
                                  WHEN 3 THEN TuesdayStartingFrom
                                  WHEN 4 THEN WednesdayStartingFrom
                                  WHEN 5 THEN ThursdayStartingFrom
                                  WHEN 6 THEN FridayStartingFrom
                                  WHEN 7 THEN SaturdayStartingFrom
                END,
            @TodayEndTime = CASE @DayIndex
                                WHEN 1 THEN SundayEndingAt
                                WHEN 2 THEN MondayEndingAt
                                WHEN 3 THEN TuesdayEndingAt
                                WHEN 4 THEN WednesdayEndingAt
                                WHEN 5 THEN ThursdayEndingAt
                                WHEN 6 THEN FridayEndingAt
                                WHEN 7 THEN SaturdayEndingAt
                END,
            @TodayBreakTimeStart = CASE @DayIndex
                                       WHEN 1 THEN SundayLunchTimeStartingFrom
                                       WHEN 2 THEN MondayLunchTimeStartingFrom
                                       WHEN 3 THEN TuesdayLunchTimeStartingFrom
                                       WHEN 4 THEN WednesdayLunchTimeStartingFrom
                                       WHEN 5 THEN ThursdayLunchTimeStartingFrom
                                       WHEN 6 THEN FridayLunchTimeStartingFrom
                                       WHEN 7 THEN SaturdayLunchTimeStartingFrom
                END,
            @TodayBreakTimeEnd = CASE @DayIndex
                                     WHEN 1 THEN SundayLunchTimeEndingAt
                                     WHEN 2 THEN MondayLunchTimeEndingAt
                                     WHEN 3 THEN TuesdayLunchTimeEndingAt
                                     WHEN 4 THEN WednesdayLunchTimeEndingAt
                                     WHEN 5 THEN ThursdayLunchTimeEndingAt
                                     WHEN 6 THEN FridayLunchTimeEndingAt
                                     WHEN 7 THEN SaturdayLunchTimeEndingAt
                END,
            @TodayNightShift = CASE @DayIndex
                                   WHEN 1 THEN SundayNightShift
                                   WHEN 2 THEN MondayNightShift
                                   WHEN 3 THEN TuesdayNightShift
                                   WHEN 4 THEN WednesdayNightShift
                                   WHEN 5 THEN ThursdayNightShift
                                   WHEN 6 THEN FridayNightShift
                                   WHEN 7 THEN SaturdayNightShift
                END
        FROM dbo.HumanResourcesShiftPattern
        WHERE id = @ShiftId;

        if @ShiftStartTime is null
	        and @ShiftEndTime is null
        begin
	        if exists(select * from dbo.HumanResourcesLeaveApplication where
		        EmployeeRowID = @EmployeeRowId and
		        Status = 1 and cast(@ShiftDate as date) between StartDate and EndDate and HalfDay = 1) -- if today is approved leave and is not half day
            begin
            select @SessionToday = CASE
                                       WHEN MorningSession= 1 THEN 1
                                       WHEN AfternoonSession = 1 THEN 2
                                       ELSE 0 -- Set a default value if neither condition is met
                end from dbo.HumanResourcesLeaveApplication where EmployeeRowID = @EmployeeRowId and Status = 1 and cast(@ShiftDate as date) between StartDate and EndDate and HalfDay = 1 -- if today is approved leave and is not half day
                if(@SessionToday = 1)--take leave for morning session
            begin
						            set @ShiftStartTime =  CAST(CONVERT(VARCHAR(10), @ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), @TodayBreakTimeEnd, 108) AS DATETIME);
						            set @ShiftEndTime = CAST(CONVERT(VARCHAR(10), @ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), @TodayEndTime, 108) AS DATETIME);
            end
            else if(@SessionToday = 2)--take leave for afternoon session
            begin
						            set @ShiftStartTime =  CAST(CONVERT(VARCHAR(10), @ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), @TodayStartTime, 108) AS DATETIME);
						            set @ShiftEndTime = CAST(CONVERT(VARCHAR(10), @ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), @TodayBreakTimeStart, 108) AS DATETIME);
            end
        end
        else
        begin
				        set @ShiftStartTime  =
				        CAST(CONVERT(VARCHAR(10), @ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), @TodayStartTime, 108) AS DATETIME);
				        set @ShiftEndTime  =
				        CAST(CONVERT(VARCHAR(10), @ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), @TodayEndTime, 108) AS DATETIME);
        end

		        if @ShiftStartTime is not null and  @ShiftEndTime is not null
        begin
			        if @ShiftEndTime < @ShiftStartTime
				        set @ShiftEndTime = dateadd(DAY,1,@ShiftEndTime)
        end
        end
        Update dbo.HumanResourcesShiftAttendanceRecord SET ShiftStartTime = @ShiftStartTime,ShiftEndTime = @ShiftEndTime where ID = @Id

        fetch next from @cursor into @Id,@EmployeeRowId,@ShiftId,@ShiftDate,@ShiftStartTime,@ShiftEndTime
    END
	




	

END
