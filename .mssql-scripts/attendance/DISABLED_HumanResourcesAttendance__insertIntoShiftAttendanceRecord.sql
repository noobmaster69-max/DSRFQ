CREATE   TRIGGER [dbo].[insertIntoShiftAttendanceRecord]
   ON  [dbo].[HumanResourcesAttendance] 
   AFTER  INSERT
AS 
BEGIN
	-- interfering with SELECT statements.
	declare @LatestId int,@LatestTime datetime;
	--select top 1 @LatestId = ID,@LatestTime = AuthenticationDateTime from dbo.HumanResourcesAttendance order by id desc;
	declare @EmployeeID nvarchar(MAX),@EmployeeRowID int;
	declare @Today datetime = getdate();
	declare @TodayDate date = CAST(@Today as date)
	DECLARE @Yesterday DATE = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE);


	--SELECT ID,AuthenticationDateTime,EmployeeID FROM inserted ;


	DECLARE cur CURSOR FOR 
	SELECT ID,AuthenticationDateTime,EmployeeID   FROM inserted
	--where AuthenticationDate = cast(GETDATE() as date) 
	--where Processed=0 and EmployeeRowID = 180 ORDER BY ID DESC;

	OPEN cur;

	FETCH NEXT FROM cur INTO @LatestId, @LatestTime,@EmployeeId;
	WHILE @@FETCH_STATUS = 0  -- Loop while there are rows to fetch
	BEGIN

	DECLARE @EmloyeeOtEntitlement INT;
	DECLARE @JobGradeId INT;
	DECLARE @NightShift INT = 0;
	declare @ClockInGracePeriod int,@MinimumOtPeriod int, @ClockOutGracePeriod int, @OtTime int,@LateArrivalEqualHalfDayLeave int,
	@LateArrivalEqualFullDayLeave int,@FixedOtRateOption int;
	select @ClockInGracePeriod = ClockInGracePeriod, @MinimumOtPeriod = OTMinimumMinute, 
	@ClockOutGracePeriod = ClockOutGracePeriod, @LateArrivalEqualFullDayLeave = LateArrivalEqualFullDayLeave,
	@LateArrivalEqualHalfDayLeave = LateArrivalEqualHalfDayLeave
	from dbo.HumanResourcesCompanySettings where IsActive = 1;
	DECLARE @BasicSalary float;
	select  @EmployeeRowID = ID,@BasicSalary = BasicSalary,@EmloyeeOtEntitlement =OtPayEntitlement from dbo.HumanResourcesEmployee where EmployeeID = @EmployeeID and IsActive = 1;

	UPDATE dbo.HumanResourcesAttendance
	SET EmployeeRowID = @EmployeeRowID
	WHERE ID = @LatestId;	--insert EmployeeRowId
	
	-- If time difference is less than 60 seconds, delete the latest one
	DECLARE @TimeDiffInSeconds INT;
	DECLARE @LatestAuthenticationDateTime DATETIME;

	WITH CTE AS (
		SELECT TOP 2 AuthenticationDateTime,ID
		FROM dbo.HumanResourcesAttendance 
		WHERE EmployeeRowID = @EmployeeRowID
		ORDER BY id desc
	)
	SELECT 
		@TimeDiffInSeconds = DATEDIFF(SECOND, MIN(AuthenticationDateTime), MAX(AuthenticationDateTime)),
		@LatestAuthenticationDateTime = MAX(AuthenticationDateTime)
	FROM CTE;
	
	print @TimeDiffInSeconds
	IF @TimeDiffInSeconds < 60*5
	BEGIN
		--DELETE FROM dbo.HumanResourcesAttendance 
		--WHERE EmployeeRowID = @EmployeeRowID AND AuthenticationDateTime = @LatestAuthenticationDateTime;
		FETCH NEXT FROM cur INTO @LatestId, @LatestTime,@EmployeeId;
		continue
    END


		


	declare @ShiftId int = ISNULL(
    (SELECT ShiftID 
     FROM dbo.HumanResourcesEmployeeShiftHistory 
     WHERE EmployeeRowID = @EmployeeRowId 
       AND IsActive = 1
       AND CAST(@Today AS DATE) BETWEEN CAST(ShiftStartDate AS DATE) AND CAST(ShiftEndDate AS DATE)), 
    0);
	if @ShiftId = 0 --if today no shift, exit
	begin
	FETCH NEXT FROM cur INTO @LatestId, @LatestTime,@EmployeeId;
	continue
	end
	print @ShiftId
	--if current time surpass yesterday's shift end time and 
	--day increment by one and yesterday not night shift
	declare @YesterDayShiftId int = ISNULL(
    (SELECT ShiftID 
     FROM dbo.HumanResourcesEmployeeShiftHistory 
     WHERE EmployeeRowID = @EmployeeRowId 
       AND IsActive = 1
       AND CAST(@Yesterday AS DATE) BETWEEN CAST(ShiftStartDate AS DATE) AND CAST(ShiftEndDate AS DATE)), 
    0);
	declare @YesterdayShiftEndTime datetime
	declare @YesterdayDayIndex int = DATEPART(WEEKDAY, @Yesterday);
	declare @YesterdayNightShift int
	declare @YesterdayEndTime nvarchar(10)
	SELECT 
		@YesterdayEndTime = CASE @YesterdayDayIndex
                WHEN 1 THEN SundayNightShift
                WHEN 2 THEN MondayNightShift
                WHEN 3 THEN TuesdayNightShift
                WHEN 4 THEN WednesdayNightShift
                WHEN 5 THEN ThursdayNightShift
                WHEN 6 THEN FridayNightShift
                WHEN 7 THEN SaturdayNightShift
				end,
		@YesterdayEndTime = CASE @YesterdayDayIndex
                WHEN 1 THEN SundayEndingAt
                WHEN 2 THEN MondayEndingAt
                WHEN 3 THEN TuesdayEndingAt
                WHEN 4 THEN WednesdayEndingAt
                WHEN 5 THEN ThursdayEndingAt
                WHEN 6 THEN FridayEndingAt
                WHEN 7 THEN SaturdayEndingAt
            END
	FROM dbo.HumanResourcesShiftPattern
	WHERE id = @YesterDayShiftId;
	if @YesterdayNightShift = 1
		set @YesterdayShiftEndTime = CAST(CONVERT(VARCHAR(10), @Today, 120) + ' ' + CONVERT(VARCHAR(8), @YesterdayEndTime, 108) AS DATETIME);
	else
		set @YesterdayShiftEndTime = CAST(CONVERT(VARCHAR(10), @Yesterday, 120) + ' ' + CONVERT(VARCHAR(8), @YesterdayEndTime, 108) AS DATETIME);
	
	update HumanResourcesAttendance set Processed = 1 where EmployeeRowID = @EmployeeRowID and AuthenticationDateTime < @YesterdayShiftEndTime
	
	
	declare @RowNumber int;
	select @RowNumber = count(*) from dbo.HumanResourcesAttendance where EmployeeRowID = @EmployeeRowId and Processed = 0;
	print @RowNumber
	if @RowNumber = 1 -- create record
	begin
		if(exists(select * from HumanResourcesShiftAttendanceRecord where ShiftDate = @TodayDate and EmployeeRowId = @EmployeeRowID))
		begin
			FETCH NEXT FROM cur INTO @LatestId, @LatestTime,@EmployeeId;
			continue;
		end

	declare @ProcessedRowNumber int,@GroupId as int = 0
		,@LateIn as int = 0
		,@ot as int = 0

	select @ShiftId = ShiftID from dbo.HumanResourcesEmployeeShiftHistory where EmployeeRowID = @EmployeeRowId and IsActive = 1
	and cast(@Today as date) between cast(ShiftStartDate as date) and cast(ShiftEndDate as date);
	
	if @ShiftId != 0
	begin
	

	DECLARE @sql NVARCHAR(MAX);
	DECLARE @params NVARCHAR(MAX);
	DECLARE @StartTime VARCHAR(50),@EndTime VARCHAR(50),@NightShiftStart VARCHAR(50),@NightShiftEnd VARCHAR(50),@WorkingTime int;
	DECLARE @LunchTimeStart nvarchar(MAX),@LunchTimeEnd nvarchar(MAX)
	DECLARE @ShiftType int;
	declare @HalfDay int = 0,@Session int = -1;
	if exists(select * from dbo.HumanResourcesLeaveApplication where Status = 1 and cast(@LatestTime as date) between StartDate and EndDate and HalfDay = 1) -- if today is approved leave and is not half day
	begin
		set @HalfDay = 1;
		select @Session = CASE
		WHEN MorningSession= 1 THEN 1
		WHEN AfternoonSession = 1 THEN 2
		ELSE 0 -- Set a default value if neither condition is met
		end from dbo.HumanResourcesLeaveApplication where Status = 1 and cast(@LatestTime as date) between StartDate and EndDate and HalfDay = 1 -- if today is approved leave and is not half day
	end
	
	select @NightShiftStart =NightShiftBetweenStart,@NightShiftEnd=NightShiftBetweenEnd from dbo.HumanResourcesShiftPattern where id = @ShiftId;
	declare @DayIndex int = DATEPART(WEEKDAY, @LatestTime);
	SELECT 
    @StartTime = CASE @DayIndex
                    WHEN 1 THEN SundayStartingFrom
                    WHEN 2 THEN MondayStartingFrom
                    WHEN 3 THEN TuesdayStartingFrom
                    WHEN 4 THEN WednesdayStartingFrom
                    WHEN 5 THEN ThursdayStartingFrom
                    WHEN 6 THEN FridayStartingFrom
                    WHEN 7 THEN SaturdayStartingFrom
                 END,
    @EndTime = CASE @DayIndex
                    WHEN 1 THEN SundayEndingAt
                    WHEN 2 THEN MondayEndingAt
                    WHEN 3 THEN TuesdayEndingAt
                    WHEN 4 THEN WednesdayEndingAt
                    WHEN 5 THEN ThursdayEndingAt
                    WHEN 6 THEN FridayEndingAt
                    WHEN 7 THEN SaturdayEndingAt
                END,
    @ShiftType = TypeOfShift,
    @WorkingTime = CASE @DayIndex
                    WHEN 1 THEN SundayWorkingTime
                    WHEN 2 THEN MondayWorkingTime
                    WHEN 3 THEN TuesdayWorkingTime
                    WHEN 4 THEN WednesdayWorkingTime
                    WHEN 5 THEN ThursdayWorkingTime
                    WHEN 6 THEN FridayWorkingTime
                    WHEN 7 THEN SaturdayWorkingTime
                END,
    @LunchTimeStart = CASE @DayIndex
                    WHEN 1 THEN SundayLunchTimeStartingFrom
                    WHEN 2 THEN MondayLunchTimeStartingFrom
                    WHEN 3 THEN TuesdayLunchTimeStartingFrom
                    WHEN 4 THEN WednesdayLunchTimeStartingFrom
                    WHEN 5 THEN ThursdayLunchTimeStartingFrom
                    WHEN 6 THEN FridayLunchTimeStartingFrom
                    WHEN 7 THEN SaturdayLunchTimeStartingFrom
                END,
    @LunchTimeEnd = CASE @DayIndex
                    WHEN 1 THEN SundayLunchTimeEndingAt
                    WHEN 2 THEN MondayLunchTimeEndingAt
                    WHEN 3 THEN TuesdayLunchTimeEndingAt
                    WHEN 4 THEN WednesdayLunchTimeEndingAt
                    WHEN 5 THEN ThursdayLunchTimeEndingAt
                    WHEN 6 THEN FridayLunchTimeEndingAt
                    WHEN 7 THEN SaturdayLunchTimeEndingAt
                END
FROM dbo.HumanResourcesShiftPattern
WHERE id = @ShiftId;

	
	declare @LatestClockInTime datetime,@ClockOutTime datetime,@ClockInTime datetime,@EarliestClockOutTime datetime,
	@HalfDayLeaveClockInTime datetime,@FullDayLeaveClockInTime datetime;

	if(@HalfDay = 0)
	begin
	set @ClockInTime =  CAST(CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' + CONVERT(VARCHAR(8), @StartTime, 108) AS DATETIME);
	set @ClockOutTime = CAST(CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' + CONVERT(VARCHAR(8), @EndTime, 108) AS DATETIME);
	end
	else
	begin
		if(@Session = 1)--take leave for morning session
		begin
			set @ClockInTime =  CAST(CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' + CONVERT(VARCHAR(8), @LunchTimeEnd, 108) AS DATETIME);
			set @ClockOutTime = CAST(CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' + CONVERT(VARCHAR(8), @EndTime, 108) AS DATETIME);
		end
		else if(@Session = 2)--take leave for afternoon session
		begin
			set @ClockInTime =  CAST(CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' + CONVERT(VARCHAR(8), @StartTime, 108) AS DATETIME);
			set @ClockOutTime = CAST(CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' + CONVERT(VARCHAR(8), @LunchTimeStart, 108) AS DATETIME);
		end
	end
	if @ClockOutTime < @ClockInTime
	begin
		set @ClockOutTime = dateadd(DAY,1,@ClockOutTime)
		set @NightShift = 1
	end
	if @NightShift = 0
	begin
	IF (
    -- Shift starts during the night shift (18:00 - 07:00)
    (@StartTime >= @NightShiftStart OR @StartTime < @NightShiftEnd)
    OR
    -- Shift ends during the night shift (18:00 - 07:00)
    (@EndTime > @NightShiftStart OR @EndTime <= @NightShiftEnd)
    OR
    -- Shift spans across the entire night shift
    (@StartTime < @NightShiftEnd AND @EndTime > @NightShiftStart)
)
BEGIN
    SET @NightShift = 1; -- Night shift
END
	end
	if @LatestTime > @ClockInTime
	set @LateIn = 1



	INSERT INTO dbo.HumanResourcesShiftAttendanceRecord(LateIn,EmployeeRowId, ShiftDate, TimeInRowId, TimeIn, ShiftId,ShiftStartTime,ShiftEndTime,NightShift)
	VALUES (@LateIn,@EmployeeRowID, @Today, @LatestId,@LatestTime, @ShiftId,@ClockInTime,@ClockOutTime,@NightShift);
	end
	
	end
	else if @RowNumber >= 2
	begin
		
		declare @ClockOutTimeRecorded datetime,@ShiftAttendanceRecordToUpdate int,@ShiftStartTime datetime,@ShiftEndTime datetime;
		if @NightShift = 0
			select top 1 @ClockInTime = TimeIn,@ShiftAttendanceRecordToUpdate = ID,@ShiftStartTime=ShiftStartTime, @ShiftEndTime=ShiftEndTime from dbo.HumanResourcesShiftAttendanceRecord where EmployeeRowId = @EmployeeRowID and ShiftDate = @TodayDate order by id desc
		else
			select top 1 @ClockInTime = TimeIn,@ShiftAttendanceRecordToUpdate = ID,@ShiftStartTime=ShiftStartTime, @ShiftEndTime=ShiftEndTime from dbo.HumanResourcesShiftAttendanceRecord where EmployeeRowId = @EmployeeRowID and ShiftDate = @Yesterday order by id desc
		set @ClockOutTime = @LatestTime
		


		update dbo.HumanResourcesShiftAttendanceRecord set TimeOutRowId = @LatestId,TimeOut = @LatestTime where ID = @ShiftAttendanceRecordToUpdate;
		declare @OtEntitlement int = 0, @OtEntitlementCondition int;
		select @OtEntitlementCondition = CASE
		WHEN MaximumBasicSalaryToEntitleForOTPay = 1 THEN 1
		WHEN MaximumJobGradeToEntitleForOTPay = 1 THEN 2
		ELSE 0 -- Set a default value if neither condition is met
		end from dbo.HumanResourcesCompanySettings where IsActive = 1
		declare @ActiveCompanyPolicyId int,@TakenOtMinute int = 0,@BalanceMaximumMinutes int = 0
		select @ActiveCompanyPolicyId = ID from dbo.HumanResourcesCompanySettings where IsActive = 1
		if @OtEntitlementCondition = 1 or @OtEntitlementCondition = 2
		begin
		declare @MaximumBasicSalary float
		select @MaximumBasicSalary=MaximumBasicSalary from dbo.HumanResourcesCompanySettings where IsActive = 1
		print @MaximumBasicSalary
		print @BasicSalary
		print 'salary'
		if @MaximumBasicSalary > @BasicSalary
			set @OtEntitlement = 1
		end
		else
			set @OtEntitlement = 1
		print @EmloyeeOtEntitlement
		print '@EmloyeeOtEntitlement'
		if @EmloyeeOtEntitlement = 1  -- if employee is entitled for ot payments
		begin
			print 'haha'
			print @OtEntitlementCondition
			print '@OtEntitlementCondition'

			if @OtEntitlementCondition = 1 -- check basic salary
			begin
				declare @MaximumOtMinute int;
				select @MaximumOtMinute=MaximumOtMinute  from dbo.HumanResourcesCompanySettings where IsActive = 1;
				select @TakenOtMinute = sum(OtMinute) from dbo.HumanResourcesOT where Status = 1 and Paid = 0 and EmployeeRowID = @EmployeeRowID;
				print 'maximum ot minute'
				print @MaximumOtMinute
				set @BalanceMaximumMinutes = @MaximumOtMinute - @TakenOtMinute
			end

			else if @OtEntitlementCondition = 2 --check job grade
			begin
				declare @JobGradeMaximumMinutes int
				select @MaximumBasicSalary=MaximumBasicSalary  from dbo.HumanResourcesCompanySettings where IsActive = 1
				select @JobGradeMaximumMinutes = OTMaximumMinutes from dbo.HumanResourcesOTJobGradeTime where CompanySettingID = @ActiveCompanyPolicyId and JobGradeId = @JobGradeId and IsActive = 1
				select @TakenOtMinute = sum(OtMinute) from dbo.HumanResourcesOT where Status = 1 and Paid = 0 and EmployeeRowID = @EmployeeRowID
				set @BalanceMaximumMinutes = @JobGradeMaximumMinutes - @TakenOtMinute
			end
			else if @OtEntitlementCondition = 0 --limitless ot time and dont check basic pay
				set @BalanceMaximumMinutes = 9999999
		end
		set @HalfDayLeaveClockInTime = DATEADD(MINUTE, @LateArrivalEqualHalfDayLeave, @ClockInTime)
		set @FullDayLeaveClockInTime = DATEADD(MINUTE, @LateArrivalEqualFullDayLeave, @ClockInTime)
		declare @OtDate as date,@StartHour as int,@EndHour as int
		,@StartMinute as int,@EndMinute as int,@OtRate DECIMAL(10, 2),
		@AllocatedWorkingTime as int,@NplRate float;
		print @FixedOtRateOption
		print '@FixedOtRateOption'
		print @EmployeeRowId


		--else
		--begin
		--select @OtRate = FixedOtRate from dbo.HumanResourcesCompanySettings where IsActive = 1
		--end
		print @OtRate
		print '@OtRate'
		--CREATE TABLE #NplResult (
		--	NplRate float,
		--	Deductions float
		--);
		--INSERT INTO #NplResult (NplRate,Deductions)
		--EXEC  dbo.CalculateNoPaidLeaveRate @EmployeeRowId
		--SELECT @NplRate = NplRate FROM #NplResult;
		--DROP TABLE #NplResult;
		declare @StartingTimeRange datetime,@EndingTimeRange datetime			
		declare @EarlyClockOutMinutes int;
		declare @LateClockInMinute int;
		DECLARE @TotalWorkingTime INT =0;

		declare @OTStart datetime
		declare @OtStartTime nvarchar(100) 
		declare @OtEndTime nvarchar(100) 
		DECLARE @OtStartDatetime AS DATETIME
		DECLARE @OtEndDatetime AS DATETIME

		set @LateClockInMinute  = (DATEDIFF(MINUTE,@ShiftStartTime, @ClockInTime))
		print @LateClockInMinute
		print 'late'
		if @ClockInTime > @FullDayLeaveClockInTime -- full day absent
			begin
			--update dbo.HumanResourcesShiftAttendanceRecord set EarlyLeave = 1 where ID = @ShiftAttendanceRecordToUpdate;
						if(not exists (select * from HumanResourcesNoPaidLeave where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate))
			INSERT INTO dbo.HumanResourcesNoPaidLeave (EmployeeRowID,LeaveDate,HalfDay,Deductions,ShiftAttendanceRecordID )
			VALUES (@EmployeeRowId,cast(@LatestTime as date),0,@NplRate,@ShiftAttendanceRecordToUpdate);
			end
		else if @ClockInTime > @HalfDayLeaveClockInTime -- half day absent
			begin
			--update dbo.HumanResourcesShiftAttendanceRecord set EarlyLeave = 1 where ID = @ShiftAttendanceRecordToUpdate;

			set @NplRate = @NplRate / 2
			if(not exists (select * from HumanResourcesNoPaidLeave where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate))
			INSERT INTO dbo.HumanResourcesNoPaidLeave (EmployeeRowID,LeaveDate,HalfDay,Deductions,ShiftAttendanceRecordID )
			VALUES (@EmployeeRowId,cast(@LatestTime as date),1,@NplRate,@ShiftAttendanceRecordToUpdate);
			end
			
		else if @LateClockInMinute > @ClockInGracePeriod -- late
			begin
			SET @LateIn = 1; -- Employee is late
			declare @LateRate float = @NplRate / @WorkingTime -- salary per minute = salary per day/ working minutes per day
			declare @LateClockInDeductions float = abs(@LateClockInMinute * @LateRate)
			if(not exists (select * from HumanResourcesLate where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate))
			INSERT INTO dbo.HumanResourcesLate (EmployeeRowID,LateMins,Date,Deductions,Deducted,ShiftAttendanceRecordID )
			VALUES (@EmployeeRowId,@LateClockInMinute,@LatestTime,@LateClockInDeductions,0,@ShiftAttendanceRecordToUpdate);
			
			update dbo.HumanResourcesShiftAttendanceRecord set LateIn = 1 where ID = @ShiftAttendanceRecordToUpdate;

			end
		set @EarliestClockOutTime = DATEADD(MINUTE, -@ClockOutGracePeriod, @ShiftEndTime)
	
		print @EarliestClockOutTime
		print '@EarliestClockOutTime'
		
		print @LatestTime
		print '@LatestTime'
		if @LatestTime >= @ShiftEndTime -- check whether is ot 
		begin
		update dbo.HumanResourcesShiftAttendanceRecord set EarlyLeave = 0 where ID = @ShiftAttendanceRecordToUpdate;

		set @OtTime = (DATEDIFF(MINUTE, @ShiftEndTime, @LatestTime) )-- ot minutes
		if @OtEntitlementCondition = 2 -- if is job grade
			begin
			if @OtTime > @BalanceMaximumMinutes
				set @OtTime = @BalanceMaximumMinutes
			end
		print 'haha'
		print @OtTime
		print @MinimumOtPeriod
		print @OtEntitlement
		print @BalanceMaximumMinutes
		set @BalanceMaximumMinutes = 5000
		IF  @OtTime >= @MinimumOtPeriod and @OtEntitlement = 1 and @BalanceMaximumMinutes > 0
			BEGIN
			SET @ot = 1; -- Employee get ot reimbursement
			set @OtDate = CAST(@LatestTime as date)
			set @StartHour = CAST( DATEPART(HOUR, @ClockOutTime) as int)
			set @StartMinute = CAST( DATEPART(minute, @ClockOutTime) as int)
			set @EndHour = CAST( DATEPART(HOUR, @LatestTime) as int)
			set @EndMinute = CAST( DATEPART(minute, @LatestTime) as int)
			declare @OtType int = dbo.CheckOtType(@OtDate);  -- Replace with your desired date
			
			declare @OnePointFive int,@OnePointZero int,@TwoPointZero int,@rate int;
			if @OtType = 1 -- public holiday
			begin
			select @rate = CASE
			WHEN PublicHolidayOnePointFive = 1 THEN 1
			WHEN PublicHolidayTwo = 1 THEN 2
			ELSE 0 -- Set a default value if neither condition is met
			end from dbo.HumanResourcesCompanySettings where IsActive = 1
			end
			else if @OtType = 2 -- weekday
			begin
			select @rate = CASE
			WHEN WeekdayOnePointFive = 1 THEN 1
			WHEN WeekdayTwo = 1 THEN 2
			ELSE 0 -- Set a default value if neither condition is met
			end from dbo.HumanResourcesCompanySettings where IsActive = 1
			end
			else if @OtType = 3 -- weekend
			begin
			select @rate = CASE
			WHEN WeekendOnePointFive = 1 THEN 1
			WHEN WeekdayTwo = 1 THEN 2
			ELSE 0 -- Set a default value if neither condition is met
			end from dbo.HumanResourcesCompanySettings where IsActive = 1
			end

			--if(exists(select * from dbo.HumanResourcesOT where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate) )
			--update HumanResourcesOT set OTDate = @OtDate,StartingHour = @StartHour,
			--EndingHour = @EndHour,StartingMinute = @StartMinute,EndingMinute = @EndMinute,StartingTime = @ClockOutTime,EndingTime = @LatestTime
			--where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate
			--else
			--	begin
			--	INSERT INTO dbo.HumanResourcesOT 
			--(
			--	EmployeeRowID, OTDate, StartingHour, EndingHour, StartingMinute, EndingMinute, 
			--	OtRate, StartingTime, EndingTime, ShiftAttendanceRecordID, WeekdayOt, WeekendOt, PublicHolidayOt
			--	--,OnePointZero,OnePointFive,TwoPointZero
			--)
			--VALUES 
			--(
			--	@EmployeeRowId, 
			--	@OtDate, 
			--	@StartHour, 
			--	@EndHour, 
			--	@StartMinute, 
			--	@EndMinute, 
			--	@OtRate, 
			--	@ClockOutTime, 
			--	@LatestTime, 
			--	@ShiftAttendanceRecordToUpdate,
			--	CASE 
			--		WHEN @OtType = 2 THEN 1  -- Weekday
			--		ELSE 0
			--	END,
			--	CASE 
			--		WHEN @OtType = 3 THEN 1  -- Weekend
			--		ELSE 0
			--	END,
			--	CASE 
			--		WHEN @OtType = 1 THEN 1  -- Public Holiday
			--		ELSE 0
			--	END
			--	/*
			--	,CASE  --1.0
			--		WHEN @rate = 0 THEN 1  
			--		ELSE 0
			--	END,
			--	CASE --1.5
			--		WHEN @rate = 1 THEN 1  
			--		ELSE 0
			--	END,
			--	CASE --2.0
			--		WHEN @rate = 2 THEN 1  
			--		ELSE 0
			--	END
			--	*/
			--);
			--end
			update dbo.HumanResourcesShiftAttendanceRecord set OT = 1, EarlyLeave = 0 where ID = @ShiftAttendanceRecordToUpdate;
			END
		end
		else if( @LatestTime < @EarliestClockOutTime) -- cut pay due to early leaving
		begin
		set @EarlyClockOutMinutes  = DATEDIFF(MINUTE, @ShiftEndTime, @LatestTime)
		declare @EarlyLeavingRate float = @NplRate / @WorkingTime -- salary per minute = salary per day/ working minutes per day
		declare @EarlyLeavingDeductions float = abs(@EarlyLeavingRate * @EarlyClockOutMinutes)

		if(exists(select * from dbo.HumanResourcesEarlyLeaving where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate) )
		update HumanResourcesEarlyLeaving set EarlyMins = @EarlyClockOutMinutes,Date = @LatestTime,
		Deducted = 0,Deductions = @EarlyLeavingDeductions
		where ShiftAttendanceRecordID = @ShiftAttendanceRecordToUpdate
		else
		INSERT INTO dbo.HumanResourcesEarlyLeaving (EmployeeRowID,EarlyMins,Date,Deducted,Deductions,ShiftAttendanceRecordID )
		VALUES (@EmployeeRowId,@EarlyClockOutMinutes,@LatestTime,0,@EarlyLeavingDeductions,@ShiftAttendanceRecordToUpdate);
		update dbo.HumanResourcesShiftAttendanceRecord set EarlyLeave = 1 where ID = @ShiftAttendanceRecordToUpdate;

		end
		else
			update dbo.HumanResourcesShiftAttendanceRecord set EarlyLeave = 0 where ID = @ShiftAttendanceRecordToUpdate;
		if(@LatestTime >= @EarliestClockOutTime)
			update dbo.HumanResourcesShiftAttendanceRecord set EarlyLeave = 0 where ID = @ShiftAttendanceRecordToUpdate;
		
		
	
	end
	FETCH NEXT FROM cur INTO @LatestId, @LatestTime,@EmployeeId;
	end
	
	CLOSE cur;
	DEALLOCATE cur;
END