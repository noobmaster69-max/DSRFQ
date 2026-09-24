-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE TRIGGER [dbo].[onInsertShiftAttendanceRecordTrigger] 
   ON  [dbo].[HumanResourcesShiftAttendanceRecord]
   AFTER  INSERT,update
AS 
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;
	declare @ShiftDate date,@TimeInRowId int,@TimeOutRowId int, @TimeIn datetime, @TimeOut datetime,
	@ShiftStartTime datetime, @ShiftEndTime datetime,@ShiftId int,@LatestId int,@EmployeeRowId int,
	@NoOt int,@NoEarlyLeaving int,@NoLateArrival int;


	DECLARE ShiftAttendanceRecordCursor CURSOR FOR 
	SELECT ID,EmployeeRowId,TimeInRowId,TimeOutRowId,ShiftDate,
	NoOt,NoEarlyLeaving,NoLateArrival,ShiftId  FROM inserted 
	--from humanresourcesattendance where  EmployeeRowID = 4
	--ORDER BY ID DESC;

	OPEN ShiftAttendanceRecordCursor;

	FETCH NEXT FROM ShiftAttendanceRecordCursor INTO @LatestId, @EmployeeRowId,@TimeInRowId,@TimeOutRowId,
	@ShiftDate,@NoOt,@NoEarlyLeaving,@NoLateArrival,@ShiftId;
	WHILE @@FETCH_STATUS = 0  -- Loop while there are rows to fetch
	BEGIN

	if @ShiftId is null
	begin
		FETCH NEXT FROM ShiftAttendanceRecordCursor INTO @LatestId, @EmployeeRowId,@TimeInRowId,@TimeOutRowId,
		@ShiftDate,@NoOt,@NoEarlyLeaving,@NoLateArrival,@ShiftId;
		continue

	end

	declare @WaiveAbsent int = 0, @WaiveEarlyLeave int = 0, @WaiveLate int = 0;
	select @WaiveAbsent=WaiveAbsent,@WaiveEarlyLeave = WaiveEarlyLeaving,
	@WaiveLate=WaiveLate from dbo.HumanResourcesEmployee where id = @EmployeeRowId;
	DECLARE @TodayStartTime nvarchar(MAX),@TodayEndTime nvarchar(MAX),@TodayWorkingTime int, @TodayNightShift int;
	DECLARE @TodayBreakTimeStart nvarchar(MAX),@TodayBreakTimeEnd nvarchar(MAX);
	
	declare @HalfDayToday int = 0 ;
	declare @SessionToday int = 0 ;

	declare @DayIndex int = DATEPART(WEEKDAY, @ShiftDate);


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
	if exists(select * from dbo.HumanResourcesLeaveApplication where Status = 1 and cast(@ShiftDate as date) between StartDate and EndDate and HalfDay = 1) -- if today is approved leave and is not half day
		begin
			select @SessionToday = CASE
			WHEN MorningSession= 1 THEN 1
			WHEN AfternoonSession = 1 THEN 2
			ELSE 0 -- Set a default value if neither condition is met
			end from dbo.HumanResourcesLeaveApplication where Status = 1 and cast(@ShiftDate as date) between StartDate and EndDate and HalfDay = 1 -- if today is approved leave and is not half day
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
	
	
	declare @FullDayLeave int = 0,@HalfDayLeave int = 0,@ot int = 0;

	declare @EarlyLeaving int=0,@LateArrival int=0;
	declare @ClockInGracePeriod int,@MinimumOtPeriod int, @ClockOutGracePeriod int,@LateArrivalEqualHalfDayLeave int,
	@LateArrivalEqualFullDayLeave int,@FixedOtRateOption int;
	SELECT 
    @ClockInGracePeriod = ClockInGracePeriod, 
    @MinimumOtPeriod = OTMinimumMinute, 
    @ClockOutGracePeriod = ClockOutGracePeriod, 
    @LateArrivalEqualFullDayLeave = LateArrivalEqualFullDayLeave,
    @LateArrivalEqualHalfDayLeave = LateArrivalEqualHalfDayLeave
	FROM dbo.HumanResourcesCompanySettings
	WHERE 
		@ShiftDate >= EffectiveSince
		AND (@ShiftDate <= EffectiveUntil OR EffectiveUntil IS NULL);
	select @TimeIn =  AuthenticationDateTime from dbo.HumanResourcesAttendance where id = @TimeInRowId
	select @TimeOut =  AuthenticationDateTime from dbo.HumanResourcesAttendance where id = @TimeOutRowId
	declare @LateClockInMinute int,@EarlyClockOutMinutes int,@OtTime int;
	
	
	if @TimeIn is not null
	begin
	set @LateClockInMinute  = (DATEDIFF(MINUTE,@ShiftStartTime, @TimeIn))
	if @NoLateArrival = 1
	begin
	if @LateClockInMinute > @LateArrivalEqualFullDayLeave and @WaiveAbsent = 0
		begin
		if(not exists (select * from HumanResourcesNoPaidLeave where ShiftAttendanceRecordID = @LatestId or  (LeaveDate = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)))
			INSERT INTO dbo.HumanResourcesNoPaidLeave (EmployeeRowID,LeaveDate,HalfDay,ShiftAttendanceRecordID )
			VALUES (@EmployeeRowId,@ShiftDate,1,@LatestId);

		set @FullDayLeave = 1 
		end
	else if @LateClockInMinute > @LateArrivalEqualHalfDayLeave and @WaiveAbsent = 0
		begin
		if(not exists (select * from HumanResourcesNoPaidLeave where ShiftAttendanceRecordID = @LatestId  or  (LeaveDate = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)))
			INSERT INTO dbo.HumanResourcesNoPaidLeave (EmployeeRowID,LeaveDate,HalfDay,ShiftAttendanceRecordID )
			VALUES (@EmployeeRowId,@ShiftDate,0,@LatestId);
		set @HalfDayLeave = 1
		end
	else if @LateClockInMinute > @ClockInGracePeriod  and @WaiveLate = 0
		begin
		if(exists(select * from dbo.HumanResourcesLate where ShiftAttendanceRecordID = @Latestid or  
		(Date = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)) )
		update HumanResourcesLate set LateMins = @LateClockInMinute, Date = @ShiftDate,ShiftAttendanceRecordID = @LatestId
		where 
		(
		ShiftAttendanceRecordID = @Latestid or  
		(Date = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)
		)
		and
		@LateClockInMinute>LateMins
		else
		INSERT INTO dbo.HumanResourcesLate (EmployeeRowID,LateMins,Date,ShiftAttendanceRecordID )
		VALUES (@EmployeeRowId,@LateClockInMinute,@ShiftDate,@LatestId);
		set @LateArrival = 1
		end
	 if @WaiveAbsent = 1 
		delete from dbo.HumanResourcesNoPaidLeave where ShiftAttendanceRecordID = @LatestId or  (LeaveDate = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)
	 if @WaiveLate = 1
		delete from dbo.HumanResourcesLate where ShiftAttendanceRecordID = @LatestId or  (Date = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)
	end
	else if @NoLateArrival = 0
	begin
		delete from dbo.HumanResourcesLate where ShiftAttendanceRecordID = @LatestId
		delete from dbo.HumanResourcesNoPaidLeave where ShiftAttendanceRecordID = @LatestId

		set @LateArrival = 0
	
	
	end


	end

	
	if @TimeOut is not null
	begin
	set @EarlyClockOutMinutes  = DATEDIFF(MINUTE,@TimeOut , @ShiftEndTime)
	set @OtTime = (DATEDIFF(MINUTE, @ShiftEndTime, @TimeOut) )-- ot minutes
	if @NoEarlyLeaving = 1
	begin
	
	if  @EarlyClockOutMinutes > @ClockOutGracePeriod and @WaiveEarlyLeave = 0
		begin
		set @EarlyLeaving  = 1
		if(exists(select * from dbo.HumanResourcesEarlyLeaving where ShiftAttendanceRecordID = @Latestid  or (Date = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1) ) )
		update HumanResourcesEarlyLeaving set EarlyMins = @EarlyClockOutMinutes,Date = @ShiftDate
		where (
		ShiftAttendanceRecordID = @Latestid 
		or (Date = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)
		)
		and @EarlyClockOutMinutes > EarlyMins 
		else
		INSERT INTO dbo.HumanResourcesEarlyLeaving (EmployeeRowID,EarlyMins,Date,ShiftAttendanceRecordID )
		VALUES (@EmployeeRowId,@EarlyClockOutMinutes,@ShiftDate,@LatestId);
		end
	else if(exists(select * from dbo.HumanResourcesEarlyLeaving where ShiftAttendanceRecordID = @Latestid or (Date = @ShiftDate and EmployeeRowID = @EmployeeRowId and IsActive = 1)) )
	begin
	delete from dbo.HumanResourcesEarlyLeaving where ShiftAttendanceRecordID = @Latestid
	end

	end
	else if @NoEarlyLeaving = 0
	begin
		delete from dbo.HumanResourcesEarlyLeaving where ShiftAttendanceRecordID = @LatestId
		or (EmployeeRowID = @EmployeeRowId and Date = @ShiftDate)
	set @EarlyLeaving = 0
	
	
	end

	if @NoOt = 1
	begin
	IF  @OtTime >= @MinimumOtPeriod
	begin
	declare @OtEntitlement int = 0 ;
	DECLARE @Results TABLE (
    OtEntitlement INT
	);
	-- Insert the result from the stored procedure into the table variable
	INSERT INTO @Results (OtEntitlement)
	EXEC CheckOtEntitlement @EmployeeRowId,@ShiftDate;
	SELECT  @OtEntitlement =OtEntitlement
	FROM @Results;
	if @OtEntitlement = 1
	begin
	set @ot = 1;
	if(exists(select * from dbo.HumanResourcesOT where ShiftAttendanceRecordID = @LatestId  or  (OTDate = @ShiftDate and EmployeeRowID = @EmployeeRowId)) )
	begin
	update HumanResourcesOT set OTDate = @ShiftDate,StartingTime = @ShiftStartTime,EndingTime = @ShiftEndTime,EmployeeRowID = @EmployeeRowId
	where ShiftAttendanceRecordID = @LatestId or  (OTDate = @ShiftDate and EmployeeRowID = @EmployeeRowId)
	end
	else
	begin
	insert into HumanResourcesOT(OTDate,StartingTime,EndingTime,EmployeeRowID,ShiftAttendanceRecordID) values(@ShiftDate,@ShiftStartTime,@ShiftEndTime,@EmployeeRowId,@LatestId)
	end
	end
	
	end
	end
	else if @NoOt = 0
	begin
	delete from dbo.HumanResourcesOT where ShiftAttendanceRecordID = @LatestId or  (OTDate = @ShiftDate and EmployeeRowID = @EmployeeRowId)
	set @ot = 0
	end
	end


	update HumanResourcesShiftAttendanceRecord set OT = @ot,EarlyLeave = @EarlyLeaving, LateIn = @LateArrival,TimeIn = @TimeIn,TimeOut = @TimeOut,
	ShiftStartTime = @ShiftStartTime,ShiftEndTime = @ShiftEndTime where id = @LatestId

	FETCH NEXT FROM ShiftAttendanceRecordCursor INTO @LatestId, @EmployeeRowId,@TimeInRowId,@TimeOutRowId,
	@ShiftDate,@NoOt,@NoEarlyLeaving,@NoLateArrival,@ShiftId;
	end
		
	CLOSE ShiftAttendanceRecordCursor;
	DEALLOCATE ShiftAttendanceRecordCursor;

    -- Insert statements for trigger here

END
