-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE TRIGGER [dbo].[newShiftAttendanceInsertTrigger]
   ON  [dbo].[HumanResourcesShiftAttendanceRecord]
   AFTER INSERT,UPDATE
                              AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET nocount ON;

    IF Trigger_nestlevel() > 2 -- allow fire from humanreosurcesattendance
      RETURN;

    DECLARE @ShiftDate      DATE,
            @TimeInRowId    INT,
            @TimeOutRowId   INT,
            @TimeIn         DATETIME,
            @RecordTimeIn   DATETIME,
            @RecordTimeOut DATETIME,
            @TimeOut        DATETIME,
            @ShiftStartTime DATETIME,
            @ShiftEndTime   DATETIME,
            @ShiftId        INT,
            @LatestId       INT,
            @EmployeeRowId  INT,
            @NoOt           INT,
            @NoEarlyLeaving INT,
            @NoLateArrival  INT,
            @Isactive       INT,
            @AdjTimeIn      DATETIME,
            @AdjTimeOut     DATETIME,
            @Present        INT,
            @Absent         INT;
    DECLARE @OvertimeScheduleId int
    DECLARE @OvertimeScheduleDate date
    DECLARE @OvertimeScheduleStartingTime datetime
    DECLARE @OvertimeScheduleEndingTime datetime
    -- Window 1: 10 PM the night BEFORE the shift starts, to 5 AM the day of
    -- Covers shifts that start early morning (e.g., 2:00 AM to 10:00 AM)
    DECLARE @Night1Start DATETIME 
    DECLARE @Night1End DATETIME

    -- Window 2: 10 PM the night the shift starts, to 5 AM the next morning
    -- Covers standard overnight shifts (e.g., 8:00 PM to 4:00 AM)
    DECLARE @Night2Start DATETIME 
    DECLARE @Night2End DATETIME
    DECLARE shiftattendancerecordcursor CURSOR FOR
      SELECT id,
             employeerowid,
             timeinrowid,
             timeoutrowid,
             shiftdate,
             noot,
             noearlyleaving,
             nolatearrival,
             shiftid,
             timein,
             timeout,
             isactive,
             adjtimein,
             adjtimeout,
             shiftstarttime,
             shiftendtime,
             present,
             absent
      FROM   inserted

    --from humanresourcesattendance where  EmployeeRowID = 4
    --ORDER BY ID DESC;
    OPEN shiftattendancerecordcursor;

    FETCH next FROM shiftattendancerecordcursor INTO @LatestId, @EmployeeRowId,
    @TimeInRowId, @TimeOutRowId, @ShiftDate, @NoOt, @NoEarlyLeaving, @NoLateArrival,
    @ShiftId, @TimeIn, @TimeOut, @Isactive, @AdjTimeIn, @AdjTimeOut, @ShiftStartTime
    , @ShiftEndTime, @Present, @Absent;

    WHILE @@FETCH_STATUS = 0 -- Loop while there are rows to fetch
      BEGIN
          IF @Isactive = 1
            BEGIN
                -- Check if override absent
                IF( @Absent = 1 )
                  BEGIN
                      IF( @TimeIn IS NOT NULL
                           OR @TimeOut IS NOT NULL
                           OR @AdjTimeIn IS NOT NULL
                           OR @AdjTimeOut IS NOT NULL OR @TimeInRowId is not null OR @TimeOutRowId is not null)
                        BEGIN
                            UPDATE dbo.humanresourcesshiftattendancerecord
                            SET    present = 1,
                                   absent = 0
                            WHERE  id = @LatestId
                            -- Not Absent delete the absent record

                            delete from HumanResourcesAbsentRecord  WHERE EmployeeRowID = @EmployeeRowId
                                  AND IsActive = 1
                                  AND CAST(AbsentDate AS DATE) = CAST(@ShiftDate AS DATE)
                            
                        END
                        ELSE BEGIN
                            -- Still absent
                            IF(NOT EXISTS (SELECT 1 FROM HumanResourcesAbsentRecord where EmployeeRowID = @EmployeeROwId and isActive = 1 AND CAST(AbsentDate as Date) = CAST(@ShiftDate as Date))) BEGIN
                                
                                INSERT INTO dbo.HumanResourcesAbsentRecord (EmployeeRowID,AbsentDate,InsertDate,InsertUserId,IsActive)
                                VALUES (@EmployeeROwId,@ShiftDate,CURRENT_TIMESTAMP,1,1)
                            END
                            ELSE BEGIN

                                UPDATE HumanResourcesAbsentRecord
                                SET IsActive = 1
                                WHERE ID = (
                                    SELECT TOP 1 ID
                                    FROM HumanResourcesAbsentRecord
                                    WHERE EmployeeRowID = @EmployeeRowId
                                      AND IsActive = -1
                                      AND CAST(AbsentDate AS DATE) = CAST(@ShiftDate AS DATE)
                                    ORDER BY ID DESC  
                                );

                            END
                        END
                  END

                IF( @Present = 1 )
                  BEGIN
                      IF( @TimeIn IS NULL
                          AND @TimeOut IS NULL
                          AND @AdjTimeIn IS NULL
                          AND @AdjTimeOut IS NULL AND @TimeInRowId is null and @TimeOutRowId is null )
                        BEGIN
                            UPDATE dbo.humanresourcesshiftattendancerecord
                            SET    present = 0,
                                   absent = 1
                            WHERE  id = @LatestId

                            -- Absent
                            IF(NOT EXISTS (SELECT 1 FROM HumanResourcesAbsentRecord where EmployeeRowID = @EmployeeROwId and isActive = 1 AND CAST(AbsentDate as Date) = CAST(@ShiftDate as Date))) BEGIN
                                
                                INSERT INTO dbo.HumanResourcesAbsentRecord (EmployeeRowID,AbsentDate,InsertDate,InsertUserId,IsActive)
                                VALUES (@EmployeeROwId,@ShiftDate,CURRENT_TIMESTAMP,1,1)
                            END
                            ELSE BEGIN
                                delete from HumanResourcesAbsentRecord  WHERE EmployeeRowID = @EmployeeRowId
                                  AND IsActive = -1
                                  AND CAST(AbsentDate AS DATE) = CAST(@ShiftDate AS DATE)
                                 

                            END

                        END
                        ELSE BEGIN
                            -- Not Absent delete the absent record
                            UPDATE HumanResourcesAbsentRecord
                            SET IsActive = -1
                            WHERE ID = (
                                SELECT TOP 1 ID
                                FROM HumanResourcesAbsentRecord
                                WHERE EmployeeRowID = @EmployeeRowId
                                  AND IsActive = 1
                                  AND CAST(AbsentDate AS DATE) = CAST(@ShiftDate AS DATE)
                                ORDER BY ID DESC  
                            );
                        END
                  END
                  
                  -- Overtime Schedule
                  SELECT @OvertimeScheduleId = ID, @OvertimeScheduleDate = OtDate,@OvertimeScheduleStartingTime = StartingTime,@OvertimeScheduleEndingTime = EndingTime
                 FROM dbo.HumanResourcesOvertimeSchedules 
                  WHERE IsActive = 1 AND EmployeeRowID = @EmployeeRowID AND CAST(OtDate as date) = @ShiftDate

                  SELECT @RecordTimeIn = authenticationdatetime
				  FROM   dbo.humanresourcesattendance
			      WHERE  id = @TimeInRowId

                  SELECT @RecordTimeOut = authenticationdatetime
			      FROM   dbo.humanresourcesattendance
				  WHERE  id = @TimeOutRowId

				  IF @TimeIn is null BEGIN
					SELECT @TimeIn = authenticationdatetime
					FROM   dbo.humanresourcesattendance
					WHERE  id = @TimeInRowId
				  END
				  IF @TimeOut is null BEGIN
					SELECT @TimeOut = authenticationdatetime
					FROM   dbo.humanresourcesattendance
					WHERE  id = @TimeOutRowId
				  END
                
                  

                

                IF (@ShiftId IS NULL
                    OR @ShiftId = 0) AND @OvertimeScheduleId is null
                  BEGIN



                       SET @ShiftStartTime = @TimeIn
                       SET @ShiftEndTime = @TimeIn
                      --FETCH next FROM shiftattendancerecordcursor INTO @LatestId,
                      --@EmployeeRowId
                      --,
                      --@TimeInRowId, @TimeOutRowId, @ShiftDate, @NoOt,
                      --@NoEarlyLeaving,
                      --@NoLateArrival, @ShiftId, @TimeIn, @TimeOut, @Isactive,
                      --@AdjTimeIn,
                      --@AdjTimeOut, @ShiftStartTime, @ShiftEndTime, @Present, @Absent
                      --;

                      --CONTINUE;
                  END
                  

                IF EXISTS(SELECT 1
                          FROM   dbo.humanresourcesshiftattendancerecord
                          WHERE  employeerowid = @EmployeeRowId
                                 AND shiftdate = @ShiftDate
                                 AND id != @LatestId)
                  BEGIN
                      UPDATE humanresourcesshiftattendancerecord
                      SET    isactive = -1
                      WHERE  employeerowid = @EmployeeRowId
                             AND shiftdate = @ShiftDate
                             AND id != @LatestId
                  END

                DECLARE @WaiveAbsent     INT = 0,
                        @WaiveEarlyLeave INT = 0,
                        @WaiveLate       INT = 0;

                SELECT @WaiveAbsent = waiveabsent,
                       @WaiveEarlyLeave = waiveearlyleaving,
                       @WaiveLate = waivelate
                FROM   dbo.humanresourcesemployee
                WHERE  id = @EmployeeRowId;

                DECLARE @TodayStartTime   NVARCHAR(max),
                        @TodayEndTime     NVARCHAR(max),
                        @TodayWorkingTime INT,
                        @TodayNightShift  INT;
                DECLARE @TodayBreakTimeStart NVARCHAR(max),
                        @TodayBreakTimeEnd   NVARCHAR(max);
                DECLARE @HalfDayToday INT = 0;
                DECLARE @SessionToday INT = 0;
                DECLARE @DayIndex INT = Datepart(weekday, @ShiftDate);

                SELECT @TodayWorkingTime = CASE @DayIndex
                                             WHEN 1 THEN sundayworkingtime
                                             WHEN 2 THEN mondayworkingtime
                                             WHEN 3 THEN tuesdayworkingtime
                                             WHEN 4 THEN wednesdayworkingtime
                                             WHEN 5 THEN thursdayworkingtime
                                             WHEN 6 THEN fridayworkingtime
                                             WHEN 7 THEN saturdayworkingtime
                                           END,
                       @TodayStartTime = CASE @DayIndex
                                           WHEN 1 THEN sundaystartingfrom
                                           WHEN 2 THEN mondaystartingfrom
                                           WHEN 3 THEN tuesdaystartingfrom
                                           WHEN 4 THEN wednesdaystartingfrom
                                           WHEN 5 THEN thursdaystartingfrom
                                           WHEN 6 THEN fridaystartingfrom
                                           WHEN 7 THEN saturdaystartingfrom
                                         END,
                       @TodayEndTime = CASE @DayIndex
                                         WHEN 1 THEN sundayendingat
                                         WHEN 2 THEN mondayendingat
                                         WHEN 3 THEN tuesdayendingat
                                         WHEN 4 THEN wednesdayendingat
                                         WHEN 5 THEN thursdayendingat
                                         WHEN 6 THEN fridayendingat
                                         WHEN 7 THEN saturdayendingat
                                       END,
                       @TodayBreakTimeStart = CASE @DayIndex
                       WHEN 1 THEN sundaylunchtimestartingfrom
                       WHEN 2 THEN mondaylunchtimestartingfrom
                       WHEN 3 THEN tuesdaylunchtimestartingfrom
                       WHEN 4 THEN wednesdaylunchtimestartingfrom
                       WHEN 5 THEN thursdaylunchtimestartingfrom
                       WHEN 6 THEN fridaylunchtimestartingfrom
                       WHEN 7 THEN saturdaylunchtimestartingfrom
                                              END,
                       @TodayBreakTimeEnd = CASE @DayIndex
                                              WHEN 1 THEN sundaylunchtimeendingat
                                              WHEN 2 THEN mondaylunchtimeendingat
                                              WHEN 3 THEN tuesdaylunchtimeendingat
                                              WHEN 4 THEN wednesdaylunchtimeendingat
                                              WHEN 5 THEN thursdaylunchtimeendingat
                                              WHEN 6 THEN fridaylunchtimeendingat
                                              WHEN 7 THEN saturdaylunchtimeendingat
                                            END,
                       @TodayNightShift = CASE @DayIndex
                                            WHEN 1 THEN sundaynightshift
                                            WHEN 2 THEN mondaynightshift
                                            WHEN 3 THEN tuesdaynightshift
                                            WHEN 4 THEN wednesdaynightshift
                                            WHEN 5 THEN thursdaynightshift
                                            WHEN 6 THEN fridaynightshift
                                            WHEN 7 THEN saturdaynightshift
                                          END
                FROM   dbo.humanresourcesshiftpattern
                WHERE  id = @ShiftId;

                IF(@OvertimeScheduleId is not null and (@ShiftId = 0 or @ShiftId is null))BEGIN
                    SET @ShiftStartTime = @OvertimeScheduleStartingTime
                    SET @ShiftEndTime = @OvertimeScheduleEndingTime
                    SET @TodayStartTime = CAST(@OvertimeScheduleStartingTime as time)
                    SET @TodayEndTime = CAST(@OvertimeScheduleEndingTime as time)
                    SET @TodayWorkingTime = DATEDIFF(MINUTE, @OvertimeScheduleStartingTime, @OvertimeScheduleEndingTime)
                     -- Window 1: 10 PM the night BEFORE the shift starts, to 5 AM the day of
                    -- Covers shifts that start early morning (e.g., 2:00 AM to 10:00 AM)
                    SET @Night1Start  = DATEADD(HOUR, 22, CAST(CAST(DATEADD(DAY, -1, @OvertimeScheduleStartingTime) AS DATE) AS DATETIME));
                    SET @Night1End    = DATEADD(HOUR, 5, CAST(CAST(@OvertimeScheduleStartingTime AS DATE) AS DATETIME));

                    -- Window 2: 10 PM the night the shift starts, to 5 AM the next morning
                    -- Covers standard overnight shifts (e.g., 8:00 PM to 4:00 AM)
                    SET @Night2Start  = DATEADD(HOUR, 22, CAST(CAST(@OvertimeScheduleStartingTime AS DATE) AS DATETIME));
                    SET @Night2End    = DATEADD(HOUR, 5, CAST(CAST(DATEADD(DAY, 1, @OvertimeScheduleStartingTime) AS DATE) AS DATETIME));
                    IF (@OvertimeScheduleStartingTime < @Night1End AND @OvertimeScheduleEndingTime > @Night1Start) 
                       OR (@OvertimeScheduleStartingTime < @Night2End AND @OvertimeScheduleEndingTime > @Night2Start)
                    BEGIN
                        SET @TodayNightShift = 1;
                    END
                    ELSE BEGIN
                        SET @TodayNightShift = 0;
                    END
                  END

                IF @ShiftStartTime IS NULL
                   AND @ShiftEndTime IS NULL
                  BEGIN
                      IF EXISTS(SELECT *
                                FROM   dbo.humanresourcesleaveapplication
                                WHERE  employeerowid = @EmployeeRowId
                                       AND status = 1
                                       AND Cast(@ShiftDate AS DATE) BETWEEN
                                           startdate AND enddate
                                       AND halfday = 1)
                        -- if today is approved leave and is not half day
                        BEGIN
                            SELECT @SessionToday = CASE
                                                     WHEN morningsession = 1 THEN 1
                                                     WHEN afternoonsession = 1 THEN
                                                     2
                                                     ELSE 0
                                                   -- Set a default value if neither condition is met
                                                   END
                            FROM   dbo.humanresourcesleaveapplication
                            WHERE  employeerowid = @EmployeeRowId
                                   AND status = 1
                                   AND Cast(@ShiftDate AS DATE) BETWEEN
                                       startdate AND enddate
                                   AND halfday = 1
                            -- if today is approved leave and is not half day

                            IF( @SessionToday = 1 )--take leave for morning session
                              BEGIN
                                  SET @ShiftStartTime = Cast(
                                  CONVERT(VARCHAR(10), @ShiftDate, 120)
                                  +
                                  ' '
                                  + CONVERT(VARCHAR(8), @TodayBreakTimeEnd,
                                  108)
                                  AS
                                  DATETIME);
                                  SET @ShiftEndTime = Cast(
                                  CONVERT(VARCHAR(10), @ShiftDate,
                                  120)
                                  +
                                  ' '
                                  + CONVERT(VARCHAR(8), @TodayEndTime,
                                  108)
                                  AS
                                  DATETIME);
                              END
                            ELSE IF( @SessionToday = 2 )
                              --take leave for afternoon session
                              BEGIN
                                  SET @ShiftStartTime = Cast(
                                  CONVERT(VARCHAR(10), @ShiftDate,
                                  120)
                                  +
                                  ' '
                                  + CONVERT(VARCHAR(8), @TodayStartTime
                                  ,
                                  108)
                                  AS
                                  DATETIME);
                                  SET @ShiftEndTime = Cast(
                                  CONVERT(VARCHAR(10), @ShiftDate, 120) +
                                  ' '
                                  + CONVERT(VARCHAR(8), @TodayBreakTimeStart,
                                  108)
                                  AS
                                  DATETIME);
                              END
                        END
                      ELSE
                        BEGIN
                            SET @ShiftStartTime = Cast(
                            CONVERT(VARCHAR(10), @ShiftDate,
                            120)
                            +
                            ' '
                            + CONVERT(VARCHAR(8), @TodayStartTime
                            ,
                            108)
                            AS
                            DATETIME);
                            SET @ShiftEndTime = Cast(
                            CONVERT(VARCHAR(10), @ShiftDate,
                            120)
                            +
                            ' '
                            + CONVERT(VARCHAR(8), @TodayEndTime,
                            108)
                            AS
                            DATETIME);
                        END

                      IF @ShiftStartTime IS NOT NULL
                         AND @ShiftEndTime IS NOT NULL
                        BEGIN
                            IF @ShiftEndTime < @ShiftStartTime
                              SET @ShiftEndTime = Dateadd(day, 1, @ShiftEndTime)
                        END
                  END

                DECLARE @FullDayLeave INT = 0,
                        @HalfDayLeave INT = 0,
                        @ot           INT = 0;
                DECLARE @EarlyLeaving INT=0,
                        @LateArrival  INT=0;
                DECLARE @ClockInGracePeriod           INT,
                        @MinimumOtPeriod              INT,
                        @ClockOutGracePeriod          INT,
                        @LateArrivalEqualHalfDayLeave INT,
                        @LateArrivalEqualFullDayLeave INT,
                        @FixedOtRateOption            INT;
                DECLARE @AutoInsertLate        INT = 0,
                        @AutoInsertEarly       INT = 0,
                        @AutoInsertNoPaidLeave INT = 0,
                        @AutoInsertOt          INT = 0;

                SELECT Top 1 @AutoInsertEarly = Isnull(automaticapplyearlyleaving, 0),
                       @AutoInsertLate = Isnull(automaticapplylatearrival, 0),
                       @AutoInsertOt = Isnull(automaticapplyot, 0),
                       @ClockInGracePeriod = clockingraceperiod,
                       @MinimumOtPeriod = otminimumminute,
                       @ClockOutGracePeriod = clockoutgraceperiod,
                       @LateArrivalEqualFullDayLeave = latearrivalequalfulldayleave,
                       @LateArrivalEqualHalfDayLeave = latearrivalequalhalfdayleave
                FROM   dbo.humanresourcescompanysettings
                WHERE  isActive = 1 AND @ShiftDate >= effectivesince
                       AND ( @ShiftDate <= effectiveuntil
                              OR effectiveuntil IS NULL ) order by EffectiveSince DESC;

                

                IF @AdjTimeIn IS NOT NULL
                  SET @TimeIn = @AdjTimeIn

                IF @AdjTimeOut IS NOT NULL
                  SET @TimeOut = @AdjTimeOut

                DECLARE @LateClockInMinute    INT,
                        @EarlyClockOutMinutes INT,
                        @OtTime               INT;

                --UPDATE humanresourcesabsentrecord
                --SET    isactive = -1
                --WHERE  Cast(absentdate AS DATE) = Cast(@ShiftDate AS DATE)
                --       AND employeerowid = @EmployeeRowId
                --       AND isactive = 1

                IF @TimeIn IS NOT NULL 
                  BEGIN
                      SET @LateClockInMinute = ( Datediff(minute, @ShiftStartTime,
                                                 @TimeIn
                                                 )
                                               )

                      IF @NoLateArrival = 1
                        BEGIN
                            IF @LateClockInMinute > 0
                              BEGIN
                                  IF @LateClockInMinute >=
                                     @LateArrivalEqualFullDayLeave
                                     AND @WaiveAbsent = 0
                                    BEGIN
                                        IF( NOT EXISTS (SELECT *
                                                        FROM
                                                humanresourcesnopaidleave
                                                        WHERE
                                                shiftattendancerecordid
                                                =
                                                @LatestId
                                                       ) )
                                          AND @AutoInsertLate = 1
                                          INSERT INTO dbo.humanresourcesnopaidleave
                                                      (employeerowid,
                                                       leavedate,
                                                       halfday,
                                                       shiftattendancerecordid)
                                          VALUES      (@EmployeeRowId,
                                                       @ShiftDate,
                                                       1,
                                                       @LatestId);

                                        SET @FullDayLeave = 1
                                    END
                                  ELSE IF @LateClockInMinute >=
                                          @LateArrivalEqualHalfDayLeave
                                     AND @WaiveAbsent = 0
                                    BEGIN
                                        IF( NOT EXISTS (SELECT *
                                                        FROM
                                                humanresourcesnopaidleave
                                                        WHERE
                                                shiftattendancerecordid
                                                =
                                                @LatestId
                                                       ) )
                                          AND @AutoInsertLate = 1
                                          INSERT INTO dbo.humanresourcesnopaidleave
                                                      (employeerowid,
                                                       leavedate,
                                                       halfday,
                                                       shiftattendancerecordid)
                                          VALUES      (@EmployeeRowId,
                                                       @ShiftDate,
                                                       0,
                                                       @LatestId);

                                        SET @HalfDayLeave = 1
                                    END
                                  ELSE IF @LateClockInMinute >= @ClockInGracePeriod
                                     AND @WaiveLate = 0
                                    BEGIN
                                        IF( EXISTS(SELECT *
                                                   FROM   dbo.humanresourceslate
                                                   WHERE  shiftattendancerecordid =
                                                          @Latestid) )
                                          UPDATE humanresourceslate
                                          SET    latemins = @LateClockInMinute,
                                                 date = @ShiftDate,
                                                 isactive = 1
                                          WHERE  shiftattendancerecordid = @Latestid
                                        ELSE IF @AutoInsertLate = 1
                                          INSERT INTO dbo.humanresourceslate
                                                      (employeerowid,
                                                       latemins,
                                                       date,
                                                       shiftattendancerecordid,
                                                       isactive)
                                          VALUES      (@EmployeeRowId,
                                                       @LateClockInMinute,
                                                       @ShiftDate,
                                                       @LatestId,
                                                       1);

                                        SET @LateArrival = 1
                                    END
                                  ELSE IF @LateClockInMinute < @ClockInGracePeriod
                                     AND @WaiveLate = 0
                                    BEGIN
                                        UPDATE humanresourceslate
                                        SET    isactive = -1
                                        WHERE  shiftattendancerecordid = @Latestid
                                    END
                              END
                            ELSE
                              UPDATE humanresourceslate
                              SET    isactive = -1
                              WHERE  shiftattendancerecordid = @Latestid
                        END
                      ELSE IF @NoLateArrival = 0
                        BEGIN
                            DELETE FROM dbo.humanresourceslate
                            WHERE  shiftattendancerecordid = @LatestId

                            SET @LateArrival = 0
                        END
                  END

                IF @TimeOut IS NOT NULL
                  BEGIN
                      SET @EarlyClockOutMinutes =
                      Datediff(minute, @TimeOut, @ShiftEndTime
                      )
                      SET @OtTime = ( Datediff(minute, @ShiftEndTime, @TimeOut) )
                      -- ot minutes

                      IF @NoEarlyLeaving = 1
                        BEGIN
                            IF @EarlyClockOutMinutes >= @ClockOutGracePeriod
                               AND @EarlyClockOutMinutes > 0
                               AND @WaiveEarlyLeave = 0
                              BEGIN
                                  SET @EarlyLeaving = 1

                                  IF( EXISTS(SELECT *
                                             FROM   dbo.humanresourcesearlyleaving
                                             WHERE  shiftattendancerecordid =
                                                    @Latestid) )
                                    UPDATE humanresourcesearlyleaving
                                    SET    earlymins = @EarlyClockOutMinutes,
                                           date = @ShiftDate,
                                           isactive = 1
                                    WHERE  shiftattendancerecordid = @Latestid
                                  ELSE IF @AutoInsertEarly = 1
                                    INSERT INTO dbo.humanresourcesearlyleaving
                                                (employeerowid,
                                                 earlymins,
                                                 date,
                                                 shiftattendancerecordid,
                                                 isactive)
                                    VALUES      (@EmployeeRowId,
                                                 @EarlyClockOutMinutes,
                                                 @ShiftDate,
                                                 @LatestId,
                                                 1);
                              END
                            ELSE IF @EarlyClockOutMinutes < @ClockOutGracePeriod
                               AND @WaiveLate = 0
                              BEGIN
                                  UPDATE humanresourcesearlyleaving
                                  SET    isactive = -1
                                  WHERE  shiftattendancerecordid = @Latestid
                              END
                            ELSE IF( EXISTS(SELECT *
                                       FROM   dbo.humanresourcesearlyleaving
                                       WHERE  shiftattendancerecordid = @Latestid) )
                              BEGIN
                                  DELETE FROM dbo.humanresourcesearlyleaving
                                  WHERE  shiftattendancerecordid = @Latestid
                              END
                        END
                      ELSE IF @NoEarlyLeaving = 0
                        BEGIN
                            DELETE FROM dbo.humanresourcesearlyleaving
                            WHERE  shiftattendancerecordid = @LatestId

                            SET @EarlyLeaving = 0
                        END

                      IF @NoOt = 1
                        BEGIN
                            IF @OtTime >= @MinimumOtPeriod
                               AND @OtTime > 0
                              BEGIN
                                  DECLARE @OtEntitlement INT = 0;
                                  DECLARE @Results TABLE
                                    (
                                       otentitlement INT
                                    );

                                  -- Insert the result from the stored procedure into the table variable
                                  INSERT INTO @Results
                                              (otentitlement)
                                  EXEC Checkotentitlement
                                    @EmployeeRowId,
                                    @ShiftDate;


                                  SELECT @OtEntitlement = otentitlement
                                  FROM   @Results;
                                  IF @OtEntitlement = 1
                                    BEGIN
                                        SET @ot = 1;

                                        IF( EXISTS(SELECT *
                                                   FROM   dbo.humanresourcesot
                                                   WHERE  shiftattendancerecordid =
                                                          @LatestId) )
                                          BEGIN
                                              UPDATE humanresourcesot
                                              SET    otdate = @ShiftDate,
                                                     startingtime = @ShiftStartTime,
                                                     endingtime = @ShiftEndTime,
                                                     employeerowid = @EmployeeRowId
                                              WHERE  shiftattendancerecordid =
                                                     @LatestId
                                          END
                                        ELSE IF @AutoInsertOt = 1
                                          BEGIN
                                              INSERT INTO humanresourcesot
                                                          (otdate,
                                                           startingtime,
                                                           endingtime,

                                                           employeerowid,
                                                           StartingAt,
                                                           EndingAt,
                                                           OtMinute,
                                                           insertDate,
                                                           InsertUserId,
                                                           IsActive)
                                              VALUES     (@ShiftDate,
                                                          @ShiftEndTime,
                                                          DATEADD(MINUTE,
                                                            DATEDIFF(MINUTE, 0, @TimeOut) / 30 * 30,
                                                            0),
                                                          @EmployeeRowId,
                                                          CONVERT(VARCHAR(5), @ShiftEndTime, 108),
                                                          CONVERT(VARCHAR(5), DATEADD(MINUTE,
                                                            DATEDIFF(MINUTE, 0, @TimeOut) / 30 * 30,
                                                            0), 108),
                                                          DATEDIFF(MINUTE, @ShiftEndTime, DATEADD(MINUTE,
                                                            DATEDIFF(MINUTE, 0, @TimeOut) / 30 * 30,
                                                            0)) ,
                                                          CURRENT_TIMESTAMP,1,1)
                                          END
                                    END
                              END
                        END
                      ELSE IF @NoOt = 0
                        BEGIN
                            DELETE FROM dbo.humanresourcesot
                            WHERE  shiftattendancerecordid = @LatestId

                            SET @ot = 0
                        END
                  END

                --UPDATE AR
                --SET    AR.isactive = -1
                --FROM   humanresourcesabsentrecord AR
                --WHERE  Cast(AR.absentdate AS DATE) = @ShiftDate
                --       AND AR.employeerowid = @EmployeeRowId
                IF( @Absent = 1 )
                  BEGIN
                      IF( @TimeIn IS NOT NULL
                           OR @TimeOut IS NOT NULL
                           OR @AdjTimeIn IS NOT NULL
                           OR @AdjTimeOut IS NOT NULL OR @TimeInRowId is not null OR @TimeOutRowId is not null)
                        BEGIN
                            UPDATE NPL
                            SET    NPL.isactive = -1
                            FROM   humanresourcesnopaidleave NPL
                            WHERE  Cast(NPL.leavedate AS DATE) = @ShiftDate
                                   AND NPL.employeerowid = @EmployeeRowId
                            
                        END
                        
                  END

                IF( @Present = 1 )
                  BEGIN
                      IF NOT( @TimeIn IS NULL
                          AND @TimeOut IS NULL
                          AND @AdjTimeIn IS NULL
                          AND @AdjTimeOut IS NULL AND @TimeInRowId is null and @TimeOutRowId is null )
                        BEGIN
                            UPDATE NPL
                            SET    NPL.isactive = -1
                            FROM   humanresourcesnopaidleave NPL
                            WHERE  Cast(NPL.leavedate AS DATE) = @ShiftDate
                            AND NPL.employeerowid = @EmployeeRowId
                        END
                  END
                

                UPDATE humanresourcesshiftattendancerecord
                SET    ot = @ot,
                       earlyleave = @EarlyLeaving,
                       latein = @LateArrival,
                       timein = @TimeIn,
                       timeout = @TimeOut,
                       shiftstarttime = CASE WHEN (@SHiftId is null or @ShiftId = 0) AND @OvertimeScheduleId is null THEN null else @ShiftStartTime END,
                       shiftendtime = CASE WHEN (@SHiftId is null or @ShiftId = 0) AND @OvertimeScheduleId is null THEN null else @ShiftEndTime END,
                       nightshift = @TodayNightShift
                WHERE  id = @LatestId
            END
          ELSE
            BEGIN
                UPDATE humanresourcesearlyleaving
                SET    isactive = -1
                WHERE  shiftattendancerecordid = @LatestId

                UPDATE humanresourceslate
                SET    isactive = -1
                WHERE  shiftattendancerecordid = @LatestId

                UPDATE humanresourcesnopaidleave
                SET    isactive = -1
                WHERE  shiftattendancerecordid = @LatestId
            END

          FETCH next FROM shiftattendancerecordcursor INTO @LatestId, @EmployeeRowId
          ,
          @TimeInRowId, @TimeOutRowId, @ShiftDate, @NoOt, @NoEarlyLeaving,
          @NoLateArrival, @ShiftId, @TimeIn, @TimeOut, @Isactive, @AdjTimeIn,
          @AdjTimeOut, @ShiftStartTime, @ShiftEndTime, @Present, @Absent;
      END

    CLOSE shiftattendancerecordcursor;

    DEALLOCATE shiftattendancerecordcursor;

    -- Insert statements for trigger here

END