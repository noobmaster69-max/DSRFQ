
-- =============================================
-- Author:    
-- Create date: 
-- Description:  
-- =============================================
CREATE TRIGGER [dbo].[newAttendanceTrigger]
ON [dbo].[HumanResourcesAttendance]
after INSERT
AS
  BEGIN
      -- SET NOCOUNT ON added to prevent extra result sets from
      -- interfering with SELECT statements.
      SET nocount ON;

      DECLARE @LatestId   INT,
              @LatestTime DATETIME;
      DECLARE @Today DATETIME = Getdate();
      DECLARE @TodayDate DATE= Cast(@Today AS DATE);
      DECLARE @TimeOutRowId INT
      DECLARE @TImeInRowId INT
      --select top 1 @LatestId = ID,@LatestTime = AuthenticationDateTime from dbo.HumanResourcesAttendance order by id desc;
      DECLARE @EmployeeID    NVARCHAR(max),
              @EmployeeRowID INT,
              @LatestDate    DATE;
      DECLARE @EmloyeeOtEntitlement INT;
      DECLARE @JobGradeId INT;
      DECLARE @NightShift INT = 0;
      DECLARE @ClockInGracePeriod           INT,
              @MinimumOtPeriod              INT,
              @ClockOutGracePeriod          INT,
              @OtTime                       INT,
              @LateArrivalEqualHalfDayLeave INT,
              @LateArrivalEqualFullDayLeave INT,
              @FixedOtRateOption            INT;
      DECLARE @OvertimeScheduleId int
      DECLARE @OvertimeScheduleDate date
      DECLARE @OvertimeScheduleStartingTime datetime
      DECLARE @OvertimeScheduleEndingTime datetime

      DECLARE @YesterdayOvertimeScheduleId int
      DECLARE @YesterdayOvertimeScheduleDate date
      DECLARE @YesterdayOvertimeScheduleStartingTime datetime
      DECLARE @YesterdayOvertimeScheduleEndingTime datetime
      -- Window 1: 10 PM the night BEFORE the shift starts, to 5 AM the day of
      -- Covers shifts that start early morning (e.g., 2:00 AM to 10:00 AM)
      DECLARE @Night1Start DATETIME 
      DECLARE @Night1End DATETIME

      -- Window 2: 10 PM the night the shift starts, to 5 AM the next morning
      -- Covers standard overnight shifts (e.g., 8:00 PM to 4:00 AM)
      DECLARE @Night2Start DATETIME 
      DECLARE @Night2End DATETIME
      SELECT @ClockInGracePeriod = clockingraceperiod,
             @MinimumOtPeriod = otminimumminute,
             @ClockOutGracePeriod = clockoutgraceperiod,
             @LateArrivalEqualFullDayLeave = latearrivalequalfulldayleave,
             @LateArrivalEqualHalfDayLeave = latearrivalequalhalfdayleave
      FROM   dbo.humanresourcescompanysettings
      WHERE  isactive = 1;

      DECLARE employeeattendancecursor CURSOR FOR
        SELECT id,
               authenticationdatetime,
               authenticationdate,
               employeeid
        FROM
        --dbo.[HumanResourcesAttendance] where EmployeeRowID = 200    and AuthenticationDate = '2025-05-24'
        inserted

      OPEN employeeattendancecursor;

      FETCH next FROM employeeattendancecursor INTO @LatestId, @LatestTime,
      @LatestDate, @EmployeeId;

      WHILE @@FETCH_STATUS = 0 -- Loop while there are rows to fetch
        BEGIN
           
           
            DECLARE @BasicSalary FLOAT;
            DECLARE @TodayStartTime   NVARCHAR(max),
                    @TodayEndTime     NVARCHAR(max),
                    @TodayWorkingTime INT;
            DECLARE @TodayBreakTimeStart NVARCHAR(max),
                    @TodayBreakTimeEnd   NVARCHAR(max);
            DECLARE @YesterdayStartTime   NVARCHAR(max),
                    @YesterdayEndTime     NVARCHAR(max),
                    @YesterdayWorkingTime INT;
            DECLARE @YesterdayBreakTimeStart NVARCHAR(max),
                    @YesterdayBreakTimeEnd   NVARCHAR(max);
            DECLARE @Yesterday DATE = Cast(Dateadd(day, -1, @LatestDate) AS DATE
                                      );


            SET @OvertimeScheduleId = NULL
            SET @OvertimeScheduleStartingTime = NULL
            SET @OvertimeScheduleEndingTime = NULL
            SET @YesterdayOvertimeScheduleId = NULL
            SET @YesterdayOvertimeScheduleStartingTime = NULL
            SET @YesterdayOvertimeScheduleEndingTime = NULL
            

            SELECT @EmployeeRowID = Isnull(id, 0),
                   @BasicSalary = basicsalary,
                   @EmloyeeOtEntitlement = otpayentitlement
            FROM   dbo.humanresourcesemployee
            WHERE  employeeid = @EmployeeID
                   AND isactive = 1;

            IF @EmployeeRowID = 0
                OR @EmployeeRowID IS NULL
              BEGIN
                  FETCH next FROM employeeattendancecursor INTO @LatestId,
                  @LatestTime
                  ,
                  @LatestDate, @EmployeeId;

                  CONTINUE
              END

             -- Check Overtime Schedule
            SELECT @OvertimeScheduleId = ID, @OvertimeScheduleDate = OtDate,@OvertimeScheduleStartingTime = StartingTime,@OvertimeScheduleEndingTime = EndingTime
            FROM dbo.HumanResourcesOvertimeSchedules 
            WHERE IsActive = 1 AND EmployeeRowID = @EmployeeRowID AND CAST(OtDate as date) = @LatestDate


            --Check Yesterday Schedule
            SELECT @YesterdayOvertimeScheduleId = ID, 
                   @YesterdayOvertimeScheduleStartingTime = StartingTime,
                   @YesterdayOvertimeScheduleEndingTime = EndingTime
            FROM dbo.HumanResourcesOvertimeSchedules 
            WHERE IsActive = 1 
              AND EmployeeRowID = @EmployeeRowID 
              AND CAST(OtDate AS DATE) = @Yesterday;

            UPDATE dbo.humanresourcesattendance
            SET    employeerowid = @EmployeeRowID,
                   insertdate = @Today,
                   processed = 1
            WHERE  id = @LatestId; --insert EmployeeRowId
            DECLARE @ShiftId INT = Isnull((SELECT TOP 1 shiftid
                      FROM   dbo.humanresourcesemployeeshifthistory
                      WHERE  employeerowid = @EmployeeRowId
                             AND isactive = 1
                             AND Cast(@LatestDate AS DATE) BETWEEN
                                 Cast(shiftstartdate AS DATE) AND Cast(
                                 shiftenddate AS DATE)
                      ORDER  BY id DESC), 0);

            DECLARE @YesterdayShiftId INT = Isnull((SELECT TOP 1 shiftid
                      FROM   dbo.humanresourcesemployeeshifthistory
                      WHERE  employeerowid = @EmployeeRowId
                             AND isactive = 1
                             AND Cast(@Yesterday AS DATE) BETWEEN
                                 Cast(shiftstartdate AS DATE) AND
                                 Cast(
                                 shiftenddate AS DATE)
                      ORDER  BY id DESC), 0);
            DECLARE @YesterdayDayIndex INT = Datepart(weekday, @Yesterday);
            DECLARE @DayIndex INT = Datepart(weekday, @LatestTime);
            DECLARE @TodayNightShift     INT,
                    @YesterdayNightShift INT;

            IF (@ShiftId IS NULL or @ShiftId = 0) and @OvertimeScheduleId is null AND (@YesterdayOvertimeScheduleId IS NULL and @YesterdayShiftId is null)
              BEGIN
                  IF EXISTS (SELECT 1
                             FROM   dbo.humanresourcesshiftattendancerecord
                             WHERE  shiftdate = @LatestDate
                                    AND employeerowid = @EmployeeRowID
                                    AND isactive = 1
                                    AND shiftid IS NULL)
                    BEGIN
                        PRINT 'shift id is null'

                        DECLARE @CurrentTimeIn DATETIME;

                        SELECT @CurrentTimeIn = timein
                        FROM   dbo.humanresourcesshiftattendancerecord
                        WHERE  shiftdate = @LatestDate
                               AND employeerowid = @EmployeeRowID;
                        print(@CurrentTimeIn)
                        print(@LatestTime)

                        IF @LatestTime < @CurrentTimeIn
                          BEGIN
                              UPDATE dbo.humanresourcesshiftattendancerecord
                              SET    timeout = @LatestTime,
                                     timeoutrowid = @LatestId
                              WHERE  shiftdate = @LatestDate
                                     AND employeerowid = @EmployeeRowID
                                     AND isactive = 1
                                     AND shiftid IS NULL
                          END
                        ELSE
                          BEGIN
                              SET @TimeInRowId =
                            (SELECT timeinrowid
                            FROM   dbo.humanresourcesshiftattendancerecord
                            WHERE  shiftdate = @LatestDate
                                    AND employeerowid = @EmployeeRowID
                                    AND isactive = 1)
                            print @TimeInRowId
                            print @LatestId
                            UPDATE dbo.humanresourcesshiftattendancerecord
                            SET    timein = @CurrentTimeIn,
                                    timeinrowid = @TimeInRowId,
                                    timeout = @LatestTime,
                                    timeoutrowid = @LatestId
                            WHERE  shiftdate = @LatestDate
                                    AND employeerowid = @EmployeeRowID
                                    AND isactive = 1
                                    AND shiftid IS NULL
                       
                          END
                    END
                  ELSE
                    BEGIN
                        INSERT INTO dbo.humanresourcesshiftattendancerecord
                                    (timein,
                                     timeinrowid,
                                     shiftdate,
                                     employeerowid)
                        VALUES      (@LatestTime,
                                     @LatestId,
                                     @LatestDate,
                                     @EmployeeRowID);
                    END

                  FETCH next FROM employeeattendancecursor INTO @LatestId,
                  @LatestTime
                  ,
                  @LatestDate, @EmployeeId;

                  CONTINUE
              END

            

            SET @TodayNightShift = 0
            SET @YesterdayNightShift = 0
            PRINT 'shift id'

            PRINT @ShiftId

            PRINT @DayIndex

            IF @ShiftId > 0
              BEGIN
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

                  PRINT 'shift start time'

                  PRINT @TodayStartTime

                  PRINT @TodayEndTime
              END
            if(@OvertimeScheduleId is not null)BEGIN

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
                SET @ShiftId = -1

            END
            IF @YesterdayShiftId > 0
              BEGIN
                  SELECT @YesterdayWorkingTime = CASE @YesterdayDayIndex
                                                   WHEN 1 THEN sundayworkingtime
                                                   WHEN 2 THEN mondayworkingtime
                         WHEN 3 THEN tuesdayworkingtime
                         WHEN 4 THEN wednesdayworkingtime
                         WHEN 5 THEN thursdayworkingtime
                         WHEN 6 THEN fridayworkingtime
                         WHEN 7 THEN saturdayworkingtime
                                                 END,
                         @YesterdayStartTime = CASE @YesterdayDayIndex
                                                 WHEN 1 THEN sundaystartingfrom
                                                 WHEN 2 THEN mondaystartingfrom
                                                 WHEN 3 THEN tuesdaystartingfrom
                         WHEN 4 THEN wednesdaystartingfrom
                         WHEN 5 THEN thursdaystartingfrom
                         WHEN 6 THEN fridaystartingfrom
                         WHEN 7 THEN saturdaystartingfrom
                                               END,
                         @YesterdayEndTime = CASE @YesterdayDayIndex
                                               WHEN 1 THEN sundayendingat
                                               WHEN 2 THEN mondayendingat
                                               WHEN 3 THEN tuesdayendingat
                                               WHEN 4 THEN wednesdayendingat
                                               WHEN 5 THEN thursdayendingat
                                               WHEN 6 THEN fridayendingat
                                               WHEN 7 THEN saturdayendingat
                                             END,
                         @YesterdayNightShift = CASE @YesterdayDayIndex
                                                  WHEN 1 THEN sundaynightshift
                                                  WHEN 2 THEN mondaynightshift
                                                  WHEN 3 THEN tuesdaynightshift
                         WHEN 4 THEN wednesdaynightshift
                         WHEN 5 THEN thursdaynightshift
                         WHEN 6 THEN fridaynightshift
                         WHEN 7 THEN saturdaynightshift
                                                END,
                         @YesterdayBreakTimeStart = CASE @YesterdayDayIndex
                         WHEN 1 THEN sundaylunchtimestartingfrom
                         WHEN 2 THEN mondaylunchtimestartingfrom
                         WHEN 3 THEN tuesdaylunchtimestartingfrom
                         WHEN 4 THEN wednesdaylunchtimestartingfrom
                         WHEN 5 THEN thursdaylunchtimestartingfrom
                         WHEN 6 THEN fridaylunchtimestartingfrom
                         WHEN 7 THEN saturdaylunchtimestartingfrom
                                                    END,
                         @YesterdayBreakTimeEnd = CASE @YesterdayDayIndex
                         WHEN 1 THEN sundaylunchtimeendingat
                         WHEN 2 THEN mondaylunchtimeendingat
                         WHEN 3 THEN tuesdaylunchtimeendingat
                         WHEN 4 THEN wednesdaylunchtimeendingat
                         WHEN 5 THEN thursdaylunchtimeendingat
                         WHEN 6 THEN fridaylunchtimeendingat
                         WHEN 7 THEN saturdaylunchtimeendingat
                                                  END
                  FROM   dbo.humanresourcesshiftpattern
                  WHERE  id = @YesterdayShiftId;
              END
              if(@YesterdayOvertimeScheduleId is not null)BEGIN

                SET @YesterdayStartTime = CAST(@YesterdayOvertimeScheduleStartingTime as time)
                SET @YesterdayEndTime = CAST(@YesterdayOvertimeScheduleEndingTime as time)
                SET @YesterdayWorkingTime = DATEDIFF(MINUTE, @YesterdayOvertimeScheduleStartingTime, @YesterdayOvertimeScheduleEndingTime)
                 -- Window 1: 10 PM the night BEFORE the shift starts, to 5 AM the day of
                -- Covers shifts that start early morning (e.g., 2:00 AM to 10:00 AM)
                SET @Night1Start  = DATEADD(HOUR, 22, CAST(CAST(DATEADD(DAY, -1, @YesterdayOvertimeScheduleStartingTime) AS DATE) AS DATETIME));
                SET @Night1End    = DATEADD(HOUR, 5, CAST(CAST(@YesterdayOvertimeScheduleStartingTime AS DATE) AS DATETIME));

                -- Window 2: 10 PM the night the shift starts, to 5 AM the next morning
                -- Covers standard overnight shifts (e.g., 8:00 PM to 4:00 AM)
                SET @Night2Start  = DATEADD(HOUR, 22, CAST(CAST(@YesterdayOvertimeScheduleStartingTime AS DATE) AS DATETIME));
                SET @Night2End    = DATEADD(HOUR, 5, CAST(CAST(DATEADD(DAY, 1, @YesterdayOvertimeScheduleStartingTime) AS DATE) AS DATETIME));
                IF (@YesterdayOvertimeScheduleStartingTime < @Night1End AND @YesterdayOvertimeScheduleEndingTime > @Night1Start) 
                   OR (@YesterdayOvertimeScheduleStartingTime < @Night2End AND @YesterdayOvertimeScheduleEndingTime > @Night2Start)
                BEGIN
                    SET @YesterdayNightShift = 1;
                END
                ELSE BEGIN
                    SET @YesterdayNightShift = 0;
                END
                SET @YesterdayShiftId = -1

            END
            if(@OvertimeScheduleId IS NULL AND @YesterdayOvertimeScheduleId is not null)BEGIN

                SET @YesterdayStartTime = CAST(@YesterdayOvertimeScheduleStartingTime as time)
                SET @YesterdayEndTime = CAST(@YesterdayOvertimeScheduleEndingTime as time)
                SET @YesterdayWorkingTime = DATEDIFF(MINUTE, @YesterdayOvertimeScheduleStartingTime, @YesterdayOvertimeScheduleEndingTime)
                 -- Window 1: 10 PM the night BEFORE the shift starts, to 5 AM the day of
                -- Covers shifts that start early morning (e.g., 2:00 AM to 10:00 AM)
                SET @Night1Start  = DATEADD(HOUR, 22, CAST(CAST(DATEADD(DAY, -1, @YesterdayOvertimeScheduleStartingTime) AS DATE) AS DATETIME));
                SET @Night1End    = DATEADD(HOUR, 5, CAST(CAST(@YesterdayOvertimeScheduleStartingTime AS DATE) AS DATETIME));

                -- Window 2: 10 PM the night the shift starts, to 5 AM the next morning
                -- Covers standard overnight shifts (e.g., 8:00 PM to 4:00 AM)
                SET @Night2Start  = DATEADD(HOUR, 22, CAST(CAST(@YesterdayOvertimeScheduleStartingTime AS DATE) AS DATETIME));
                SET @Night2End    = DATEADD(HOUR, 5, CAST(CAST(DATEADD(DAY, 1, @YesterdayOvertimeScheduleStartingTime) AS DATE) AS DATETIME));
                IF (@YesterdayOvertimeScheduleStartingTime < @Night1End AND @YesterdayOvertimeScheduleEndingTime > @Night1Start) 
                   OR (@YesterdayOvertimeScheduleStartingTime < @Night2End AND @YesterdayOvertimeScheduleEndingTime > @Night2Start)
                BEGIN
                    SET @YesterdayNightShift = 1;
                END
                ELSE BEGIN
                    SET @YesterdayNightShift = 0;
                END
                SET @YesterdayShiftId = -1

            END
            SET @TodayWorkingTime = Isnull(@TodayWorkingTime, 0)
            SET @YesterdayWorkingTime = Isnull(@YesterdayWorkingTime, 0)

            -- =============================================
            -- STEP 1: CROSS-MIDNIGHT OPEN RECORD CHECK
            -- Must run FIRST before any shift time logic.
            -- Scenario: Employee checked in yesterday (no shift configured or night shift),
            -- and today's scan is still within that unclosed session.
            -- Example: Sunday 20:00 check-in (no shift), Monday 08:00 checkout → belongs to Sunday.
            -- =============================================
            DECLARE @YesterdayRecordOpen INT = 0;
            DECLARE @YesterdayTimeOutDT  DATETIME;
            DECLARE @YesterdayTimeInDT   DATETIME;

            IF EXISTS (SELECT 1
                       FROM   dbo.humanresourcesshiftattendancerecord
                       WHERE  shiftdate = @Yesterday
                              AND employeerowid = @EmployeeRowID
                              AND isactive = 1)
            BEGIN
                SELECT @YesterdayTimeInDT  = timein_att.authenticationdatetime,
                        @YesterdayTimeOutDT = timeout_att.authenticationdatetime
                FROM   dbo.humanresourcesshiftattendancerecord sar
                        LEFT JOIN dbo.humanresourcesattendance timein_att
                        ON timein_att.id = sar.timeinrowid
                        LEFT JOIN dbo.humanresourcesattendance timeout_att
                        ON timeout_att.id = sar.timeoutrowid
                WHERE  sar.shiftdate = @Yesterday
                        AND sar.employeerowid = @EmployeeRowID
                        AND sar.isactive = 1;

                -- Yesterday's record is open if:
                -- 1. Timeout is still on yesterday's date (not yet pushed past midnight)
                -- 2. Current scan is later than yesterday's timein
                -- 3. Current scan is before today's configured shift start (if any),
                --    so we don't steal Monday 20:00 clock-in from Monday's night shift
                DECLARE @TodayShiftStartForCrossCheck DATETIME = NULL;

                IF @TodayStartTime IS NOT NULL
                SET @TodayShiftStartForCrossCheck = CAST(
                    CONVERT(VARCHAR(10), @LatestDate, 120) + ' ' +
                    CONVERT(VARCHAR(8), @TodayStartTime, 108) AS DATETIME);

                
                IF (
                    @YesterdayTimeOutDT IS NULL
                    OR CAST(@YesterdayTimeOutDT AS DATE) = @Yesterday
                    )
                    AND @LatestTime > ISNULL(@YesterdayTimeInDT, '1900-01-01')
                    AND CAST(@YesterdayTimeInDT AS TIME) >= '12:00:00'
                     AND DATEDIFF(HOUR, @YesterdayTimeInDT, @LatestTime) <= 24
                    --AND (
                    --    @TodayShiftStartForCrossCheck IS NULL
                    --    OR @LatestTime < @TodayShiftStartForCrossCheck
                    --    )
                SET @YesterdayRecordOpen = 1;
            END
            print('Yesterday Open')
            print(@YesterdayRecordOpen)
            IF @YesterdayRecordOpen = 1
            BEGIN
                -- Attach this scan as yesterday's cross-midnight timeout
                UPDATE sar
                SET    sar.timeoutrowid = CASE
                            WHEN new_att.authenticationdatetime
                                >= ISNULL(old_timeout_att.authenticationdatetime, '1900-01-01')
                            THEN @LatestId
                            ELSE sar.timeoutrowid
                        END,
                        sar.timeout = CASE
                            WHEN new_att.authenticationdatetime
                                >= ISNULL(old_timeout_att.authenticationdatetime, '1900-01-01')
                            THEN @LatestTime
                            ELSE sar.timeout
                        END,
                        sar.updatedate = @Today
                FROM   humanresourcesshiftattendancerecord sar
                        JOIN humanresourcesattendance new_att
                        ON new_att.id = @LatestId
                        LEFT JOIN humanresourcesattendance old_timeout_att
                        ON old_timeout_att.id = sar.timeoutrowid
                WHERE  sar.shiftdate = @Yesterday
                        AND sar.employeerowid = @EmployeeRowID
                        AND sar.isactive = 1;

                --FETCH NEXT FROM employeeattendancecursor INTO @LatestId, @LatestTime,
                --    @LatestDate, @EmployeeId;
                --CONTINUE; 
            END
            -- Calculate yesterday time out if time out ady exists but earlier than shift end time
            DECLARE @YesterdayOpenRecordEnd DATETIME = NULL
            SELECT @YesterdayOpenRecordEnd = shiftendtime
            FROM   humanresourcesshiftattendancerecord
            WHERE  shiftdate    = @Yesterday
                   AND employeerowid = @EmployeeRowID
                   AND isactive = 1
            IF EXISTS (SELECT 1 
                       FROM humanresourcesshiftattendancerecord sar
                       LEFT JOIN humanresourcesattendance tout 
                         ON tout.id = sar.timeoutrowid
                       WHERE sar.shiftdate = @Yesterday
                       AND sar.employeerowid = @EmployeeRowID
                       AND sar.isactive = 1
                       AND (
                           sar.timeoutrowid IS NULL  -- still open
                           OR tout.authenticationdatetime < @YesterdayOpenRecordEnd 
                       ))
            BEGIN
                

                IF @YesterdayOpenRecordEnd IS NOT NULL AND CAST(@YesterdayOpenRecordEnd AS DATE) > @Yesterday
                   AND @LatestTime <= DATEADD(HOUR, 2, @YesterdayOpenRecordEnd)
                BEGIN
                    UPDATE sar
                    SET    sar.timeoutrowid = @LatestId,
                           sar.timeout      = @LatestTime,
                           sar.updatedate   = @Today
                    FROM   humanresourcesshiftattendancerecord sar
                           JOIN humanresourcesattendance new_att
                             ON new_att.id = @LatestId
                           LEFT JOIN humanresourcesattendance old_att
                             ON old_att.id = sar.timeoutrowid
                    WHERE  sar.shiftdate    = @Yesterday
                           AND sar.employeerowid = @EmployeeRowID
                           AND sar.isactive = 1
                           AND (sar.timeoutrowid IS NULL
                                OR new_att.authenticationdatetime 
                                   >= old_att.authenticationdatetime)

                    FETCH NEXT FROM employeeattendancecursor INTO @LatestId, @LatestTime,
                        @LatestDate, @EmployeeId;
                    CONTINUE
                END
            END

            -- =============================================
            -- STEP 2: NULL SHIFT TIME GUARD
            -- Today's shift pattern exists but has no start/end time configured
            -- for this day of the week (e.g. shift assigned on Sunday but
            -- Sunday columns are blank). Fall back to First-In / Last-Out.
            -- =============================================
            IF @TodayStartTime IS NULL AND @TodayEndTime IS NULL
              BEGIN
                  IF EXISTS (SELECT 1
                             FROM   dbo.humanresourcesshiftattendancerecord
                             WHERE  shiftdate = @LatestDate
                                    AND employeerowid = @EmployeeRowID
                                    AND isactive = 1)
                    BEGIN
                        -- Update TimeIn if current scan is earlier,
                        -- update TimeOut if current scan is later
                        UPDATE sar
                        SET    sar.timeinrowid = CASE
                                   WHEN new_att.authenticationdatetime
                                        <= ISNULL(old_timein_att.authenticationdatetime, '9999-12-31')
                                   THEN @LatestId
                                   ELSE sar.timeinrowid
                               END,
                               sar.timein = CASE
                                   WHEN new_att.authenticationdatetime
                                        <= ISNULL(old_timein_att.authenticationdatetime, '9999-12-31')
                                   THEN @LatestTime
                                   ELSE sar.timein
                               END,
                               sar.timeoutrowid = CASE
                                   WHEN new_att.authenticationdatetime
                                        >= ISNULL(old_timeout_att.authenticationdatetime, '1900-01-01')
                                   THEN @LatestId
                                   ELSE sar.timeoutrowid
                               END,
                               sar.timeout = CASE
                                   WHEN new_att.authenticationdatetime
                                        >= ISNULL(old_timeout_att.authenticationdatetime, '1900-01-01')
                                   THEN @LatestTime
                                   ELSE sar.timeout
                               END,
                               sar.shiftid = @ShiftId,
                               sar.updatedate = @Today
                        FROM   humanresourcesshiftattendancerecord sar
                               JOIN humanresourcesattendance new_att
                                 ON new_att.id = @LatestId
                               LEFT JOIN humanresourcesattendance old_timein_att
                                 ON old_timein_att.id = sar.timeinrowid
                               LEFT JOIN humanresourcesattendance old_timeout_att
                                 ON old_timeout_att.id = sar.timeoutrowid
                        WHERE  sar.shiftdate = @LatestDate
                               AND sar.employeerowid = @EmployeeRowID
                               AND sar.isactive = 1;
                    END
                  ELSE
                    BEGIN
                        -- First scan of the day: insert with same record as both TimeIn and TimeOut.
                        -- TimeOut will keep updating as later scans arrive (handled by block above).
                        INSERT INTO dbo.humanresourcesshiftattendancerecord
                                    (employeerowid, shiftid, shiftdate,
                                     timeinrowid, timeoutrowid, insertdate)
                        VALUES      (@EmployeeRowID, @ShiftId, @LatestDate,
                                     @LatestId, @LatestId, @Today);
                    END

                  FETCH NEXT FROM employeeattendancecursor INTO @LatestId, @LatestTime,
                        @LatestDate, @EmployeeId;
                  CONTINUE; -- Skip @ClosestState logic; day has no configured shift times
              END




            DECLARE @HalfDayToday     INT = 0,
                    @HalfDayYesterday INT = 0;
            DECLARE @SessionToday     INT = 0,
                    @SessionYesterday INT = 0;

            IF EXISTS(SELECT *
                      FROM   dbo.humanresourcesleaveapplication
                      WHERE  employeerowid = @Employeerowid
                             AND status = 1
                             AND Cast(@LatestTime AS DATE) BETWEEN
                                 startdate AND enddate
                             AND halfday = 1)
              -- if today is approved leave and is not half day
              BEGIN
                  SET @HalfDayToday = 1;

                  SELECT @SessionToday = CASE
                                           WHEN morningsession = 1 THEN 1
                                           WHEN afternoonsession = 1 THEN 2
                                           ELSE 0
                                         -- Set a default value if neither condition is met
                                         END
                  FROM   dbo.humanresourcesleaveapplication
                  WHERE  status = 1
                         AND Cast(@LatestTime AS DATE) BETWEEN
                             startdate AND enddate
                         AND halfday = 1
              -- if today is approved leave and is not half day
              END

            IF EXISTS(SELECT *
                      FROM   dbo.humanresourcesleaveapplication
                      WHERE  employeerowid = @Employeerowid
                             AND status = 1
                             AND Cast(@Yesterday AS DATE) BETWEEN
                                 startdate AND enddate
                             AND halfday = 1)
              -- if today is approved leave and is not half day
              BEGIN
                  SET @HalfDayYesterday = 1;

                  SELECT @SessionYesterday = CASE
                                               WHEN morningsession = 1 THEN 1
                                               WHEN afternoonsession = 1 THEN 2
                                               ELSE 0
                                             -- Set a default value if neither condition is met
                                             END
                  FROM   dbo.humanresourcesleaveapplication
                  WHERE  employeerowid = @Employeerowid
                         AND status = 1
                         AND Cast(@LatestTime AS DATE) BETWEEN
                             startdate AND enddate
                         AND halfday = 1
              -- if today is approved leave and is not half day
              END

            DECLARE @TodayShiftStartTime DATETIME,
                    @TodayShiftEndTime   DATETIME

            IF @HalfDayToday = 0
              BEGIN
                  IF @TodayStartTime IS NULL OR @TodayEndTime IS NULL
                    BEGIN
                        -- No times configured for today in this shift pattern; already handled above,
                        -- but guard here too in case only one of start/end is null.
                        SET @TodayShiftStartTime = NULL;
                        SET @TodayShiftEndTime   = NULL;
                    END
                  ELSE
                    BEGIN
                        SET @TodayShiftStartTime = CAST(
                            CONVERT(VARCHAR(10), @LatestDate, 120) + ' ' +
                            CONVERT(VARCHAR(8), @TodayStartTime, 108) AS DATETIME);
                        SET @TodayShiftEndTime = CAST(
                            CONVERT(VARCHAR(10), @LatestDate, 120) + ' ' +
                            CONVERT(VARCHAR(8), @TodayEndTime, 108) AS DATETIME);
                    END

                  PRINT @TodayShiftStartTime;
                  PRINT @TodayShiftEndTime;
                  PRINT @LatestDate;
                  PRINT @TodayStartTime;
                  PRINT @TodayEndTime;
              END
            ELSE IF @HalfDayToday = 1
              BEGIN
                  IF @SessionToday = 1 -- Morning leave
                    BEGIN
                        SET @TodayShiftStartTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @TodayBreakTimeEnd, 108) AS DATETIME);
                        SET @TodayShiftEndTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @TodayEndTime, 108) AS DATETIME);
                    END
                  ELSE IF @SessionToday = 2 -- Afternoon leave
                    BEGIN
                        SET @TodayShiftStartTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @TodayStartTime, 108) AS DATETIME);
                        SET @TodayShiftEndTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @TodayBreakTimeStart, 108) AS DATETIME);
                    END
              END

            DECLARE @YesterdayShiftStartTime DATETIME,
                    @YesterdayShiftEndTime   DATETIME

            IF @HalfDayYesterday = 0
              BEGIN
                  IF @YesterdayStartTime IS NULL OR @YesterdayEndTime IS NULL
                    BEGIN
                        SET @YesterdayShiftStartTime = NULL;
                        SET @YesterdayShiftEndTime   = NULL;
                    END
                  ELSE
                    BEGIN
                        SET @YesterdayShiftStartTime = CAST(
                            CONVERT(VARCHAR(10), @Yesterday, 120) + ' ' +
                            CONVERT(VARCHAR(8), @YesterdayStartTime, 108) AS DATETIME);
                        SET @YesterdayShiftEndTime = CAST(
                            CONVERT(VARCHAR(10), @Yesterday, 120) + ' ' +
                            CONVERT(VARCHAR(8), @YesterdayEndTime, 108) AS DATETIME);
                    END
              END
            ELSE IF @HalfDayYesterday = 1
              BEGIN
                  IF @SessionToday = 1
                    BEGIN
                        SET @TodayShiftStartTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @YesterdayBreakTimeEnd, 108) AS DATETIME);
                        SET @TodayShiftEndTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @YesterdayEndTime, 108) AS DATETIME);
                    END
                  ELSE IF @SessionToday = 2
                    BEGIN
                        SET @TodayShiftStartTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @YesterdayStartTime, 108) AS DATETIME);
                        SET @TodayShiftEndTime = CAST(
                            CONVERT(VARCHAR(10), @LatestTime, 120) + ' ' +
                            CONVERT(VARCHAR(8), @YesterdayBreakTimeStart, 108) AS DATETIME);
                    END
              END

            IF ( EXISTS(SELECT *
                        FROM   dbo.humanresourcesearlyleaving
                        WHERE  date = @LatestDate
                               AND employeerowid = @EmployeeRowID
                               AND isactive = 1) )
              BEGIN
                  DECLARE @EarlyLeavingMins INT = 0;

                  SELECT @EarlyLeavingMins = earlymins
                  FROM   dbo.humanresourcesearlyleaving
                  WHERE  date = @LatestDate
                         AND employeerowid = @EmployeeRowID
                         AND isactive = 1

                  SET @TodayShiftEndTime =
                  Dateadd(minute, -1 * @EarlyLeavingMins,
                  @TodayShiftEndTime)
              END

            IF ( EXISTS(SELECT *
                        FROM   dbo.humanresourceslate
                        WHERE  date = @LatestDate
                               AND employeerowid = @EmployeeRowID
                               AND isactive = 1) )
              BEGIN
                  DECLARE @LateArrivalMins INT = 0;

                  SELECT @LateArrivalMins = latemins
                  FROM   dbo.humanresourceslate
                  WHERE  date = @LatestDate
                         AND employeerowid = @EmployeeRowID
                         AND isactive = 1

                  SET @TodayShiftStartTime =
                  Dateadd(minute, -1 * @LateArrivalMins
                  ,
                  @TodayShiftStartTime)
              END

            IF ( EXISTS(SELECT *
                        FROM   dbo.humanresourcesearlyleaving
                        WHERE  date = @Yesterday
                               AND employeerowid = @EmployeeRowID
                               AND isactive = 1) )
              BEGIN
                  DECLARE @YesterdayEarlyLeavingMins INT = 0;

                  SELECT @YesterdayEarlyLeavingMins = earlymins
                  FROM   dbo.humanresourcesearlyleaving
                  WHERE  date = @Yesterday
                         AND employeerowid = @EmployeeRowID
                         AND isactive = 1

                  SET @YesterdayShiftEndTime =
                  Dateadd(minute, -1 * @EarlyLeavingMins,
                  @YesterdayShiftEndTime)
              END

            IF ( EXISTS(SELECT *
                        FROM   dbo.humanresourceslate
                        WHERE  date = @Yesterday
                               AND employeerowid = @EmployeeRowID
                               AND isactive = 1) )
              BEGIN
                  DECLARE @YesterdayLateArrivalMins INT = 0;

                  SELECT @YesterdayLateArrivalMins = latemins
                  FROM   dbo.humanresourceslate
                  WHERE  date = @Yesterday
                         AND employeerowid = @EmployeeRowID
                         AND isactive = 1

                  SET @YesterdayShiftStartTime =
                  Dateadd(minute, -1 * @YesterdayLateArrivalMins
                  ,
                  @YesterdayShiftStartTime)
              END

            DECLARE @InsertToYesterday INT = 0;

            IF @TodayShiftStartTime IS NOT NULL
               AND @TodayShiftEndTime IS NOT NULL
              BEGIN
                  IF @TodayShiftEndTime < @TodayShiftStartTime
                    SET @TodayShiftEndTime = Dateadd(day, 1, @TodayShiftEndTime)
              --print @TodayShiftStartTime
              --print @TodayShiftEndTime
              END

            IF @YesterdayShiftStartTime IS NOT NULL
               AND @YesterdayShiftEndTime IS NOT NULL
              BEGIN
                  IF @YesterdayShiftEndTime < @YesterdayShiftStartTime
                    BEGIN
                        SET @YesterdayShiftEndTime =
                        Dateadd(day, 1, @YesterdayShiftEndTime)
                        SET @InsertToYesterday = 1
                    END
              --print @YesterdayShiftStartTime
              --print @YesterdayShiftEndTime
              END


            -- TODAY SHIFT DONT HAVE START/END , BUT ASSIGNED TO THE EMPLOYEE
            

            PRINT @LatestTime;

            PRINT @TodayShiftStartTime;

            PRINT @TodayShiftEndTime;

            IF EXISTS(SELECT *
                      FROM   dbo.humanresourcesshiftattendancerecord
                      WHERE  shiftdate = @LatestDate
                             AND employeerowid = @EmployeeRowID)
              PRINT 'exist'

            --print @YesterdayShiftStartTime;
            --print @YesterdayShiftEndTime;

            
            DECLARE @ClosestState INT;
       
            ;WITH timepool
                 AS (SELECT 1                                      AS LabelNum,
                            Cast(@TodayShiftStartTime AS DATETIME) AS TimeOption
                     WHERE  @TodayShiftStartTime IS NOT NULL
                     UNION ALL
                     SELECT 2,
                            Cast(@TodayShiftEndTime AS DATETIME)
                     WHERE  @TodayShiftEndTime IS NOT NULL
                     UNION ALL
                     SELECT 3,
                            Cast(@YesterdayShiftStartTime AS DATETIME)
                     WHERE  @YesterdayShiftStartTime IS NOT NULL
                     UNION ALL
                     SELECT 4,
                            Cast(@YesterdayShiftEndTime AS DATETIME)
                     WHERE  @YesterdayShiftEndTime IS NOT NULL),
                 ranked
                 AS (SELECT labelnum,
                            Abs(Datediff(second, timeoption, @LatestTime))
                            AS
                            AbsDiff,
                            Rank()
                              OVER (
                                ORDER BY Abs(Datediff(second, timeoption,
                              @LatestTime)
                              ))
                            AS
                               ProximityRank
                     FROM   timepool)
            SELECT @ClosestState = labelnum
            FROM   ranked
            WHERE  proximityrank = 1;

            --print @ClosestState
            --@ClosestState = 1 is today shift start
            --@ClosestState = 2 is today shift end
            --@ClosestState = 3 is yesterday shift start
            --@ClosestState = 4 is yesterday shift end
            PRINT @ClosestState

            IF @ClosestState <= 2
               AND @TodayShiftStartTime IS NOT NULL
               AND @TodayShiftEndTime IS NOT NULL -- today
              BEGIN
                  IF ( EXISTS(SELECT *
                              FROM   dbo.humanresourcesshiftattendancerecord
                              WHERE  shiftdate = @LatestDate
                                     AND employeerowid = @EmployeeRowID) )
                    BEGIN
                        IF @ClosestState = 1
                          BEGIN
                              UPDATE sar
                              SET    sar.timeinrowid = @LatestId,
                                     sar.timein = @LatestTime,
                                     sar.shiftid = CASE WHEN @ShiftId = -1 THEN null ELSE @ShiftId END,
                                     updatedate = @Today
                              FROM   humanresourcesshiftattendancerecord sar
                                     JOIN humanresourcesattendance new_att
                                       ON new_att.id = @LatestId
                                     LEFT JOIN humanresourcesattendance old_att
                                            ON old_att.id = sar.timeinrowid
                              WHERE  sar.shiftdate = @LatestDate
                                     AND sar.employeerowid = @EmployeeRowID
                                     AND (
                               sar.timeinrowid IS NULL
                               OR
                               ABS(DATEDIFF(SECOND, new_att.authenticationdatetime, @TodayShiftStartTime))
                               <= ABS(DATEDIFF(SECOND, old_att.authenticationdatetime, @TodayShiftStartTime))
                             );
                          END
                        ELSE IF @ClosestState = 2
                          BEGIN
                              --SET @TimeOutRowId =
                              --(SELECT timeoutrowid
                              -- FROM   dbo.humanresourcesshiftattendancerecord
                              -- WHERE  shiftdate = @LatestDate
                              --        AND employeerowid = @EmployeeRowID
                              --        AND isactive = 1)

                              --UPDATE sar
                              --SET    sar.timeinrowid = @TimeOutRowId
                              --FROM   humanresourcesshiftattendancerecord sar
                              --       JOIN humanresourcesattendance new_att
                              --         ON new_att.id = @LatestId
                              --       LEFT JOIN humanresourcesattendance old_att
                              --              ON old_att.id = sar.timeoutrowid
                              --WHERE  sar.shiftdate = @LatestDate
                              --       AND sar.employeerowid = @EmployeeRowID
                              --       AND ( sar.timeoutrowid IS NOT NULL
                              --              OR new_att.authenticationdatetime >=
                              --                 old_att.authenticationdatetime )
                              --       AND sar.timeinrowid IS NULL;

                              --UPDATE sar
                              --SET    sar.timeoutrowid = @LatestId,
                              --       ShiftId = @ShiftId,
                              --       updatedate = @Today
                              --FROM   humanresourcesshiftattendancerecord sar
                              --       JOIN humanresourcesattendance new_att
                              --         ON new_att.id = @LatestId
                              --       LEFT JOIN humanresourcesattendance old_att
                              --              ON old_att.id = sar.timeoutrowid
                              --WHERE  sar.shiftdate = @LatestDate
                              --       AND sar.employeerowid = @EmployeeRowID
                              --       AND ( sar.timeoutrowid IS NULL
                              --              OR new_att.authenticationdatetime >=
                              --                 old_att.authenticationdatetime );

                               -- Only promote previous timeout → timein if timein is still unset
                              UPDATE sar
                              SET    sar.timeinrowid  = sar.timeoutrowid,  
                                     sar.timein = sar.timeout,
                                     sar.timeoutrowid = @LatestId,
                                     sar.timeout = @LatestTime,
                                     ShiftId          = CASE WHEN @ShiftId = -1 THEN null ELSE @ShiftId END,
                                     updatedate       = @Today
                              FROM   humanresourcesshiftattendancerecord sar
                                     JOIN humanresourcesattendance new_att
                                       ON new_att.id = @LatestId
                                     LEFT JOIN humanresourcesattendance old_att
                                            ON old_att.id = sar.timeoutrowid
                              WHERE  sar.shiftdate       = @LatestDate
                                     AND sar.employeerowid = @EmployeeRowID
                                     AND sar.timeinrowid  IS NULL  
                                     AND (sar.timeoutrowid IS NULL
                                          OR new_att.authenticationdatetime 
                                             >= old_att.authenticationdatetime);

                              UPDATE sar
                              SET    sar.timeoutrowid = @LatestId,
                                     sar.timeout = @LatestTime,
                                     ShiftId          = CASE WHEN @ShiftId = -1 THEN null ELSE @ShiftId END,
                                     updatedate       = @Today
                              FROM   humanresourcesshiftattendancerecord sar
                                     JOIN humanresourcesattendance new_att
                                       ON new_att.id = @LatestId
                                     LEFT JOIN humanresourcesattendance old_att
                                            ON old_att.id = sar.timeoutrowid
                              WHERE  sar.shiftdate       = @LatestDate
                                     AND sar.employeerowid = @EmployeeRowID
                                     AND sar.timeinrowid  IS NOT NULL 
                                     AND (sar.timeoutrowid IS NULL
                                          OR new_att.authenticationdatetime 
                                             >= old_att.authenticationdatetime);
                          END
                    END
                  ELSE
                    BEGIN

                        print 'DAMNNNNN'
                        print @LatestDate
                        print @LatestId
                        IF @ClosestState = 1
                          BEGIN
                              INSERT INTO humanresourcesshiftattendancerecord
                                          (employeerowid,
                                           shiftid,
                                           nightshift,
                                           shiftdate,
                                           shiftstarttime,
                                           shiftendtime,
                                           timeinrowid,
                                           timein,
                                           insertdate)
                              VALUES      (@EmployeeRowID,
                                           CASE WHEN @ShiftId = -1 THEN null ELSE @ShiftId END,
                                           @TodayNightShift,
                                           @LatestDate,
                                           @TodayShiftStartTime,
                                           @TodayShiftEndTime,
                                           @LatestId,
                                           @LatestTime,
                                           @Today)
                          END
                        ELSE IF @ClosestState = 2
                          BEGIN
                              INSERT INTO humanresourcesshiftattendancerecord
                                          (employeerowid,
                                           shiftid,
                                           nightshift,
                                           shiftdate,
                                           shiftstarttime,
                                           shiftendtime,
                                           timeoutrowid,
                                           timeout,
                                           insertdate)
                              VALUES      (@EmployeeRowID,
                                           CASE WHEN @ShiftId = -1 THEN null ELSE @ShiftId END,
                                           @TodayNightShift,
                                           @LatestDate,
                                           @TodayShiftStartTime,
                                           @TodayShiftEndTime,
                                           @LatestId,
                                           @LatestTime,
                                           @Today)
                          END
                    END
              END
            ELSE IF @ClosestState <= 4
               AND (
                   @YesterdayNightShift = 1      -- explicit night shift flag
                   OR @InsertToYesterday = 1     -- ← ADD THIS: end time crossed midnight
               )
               AND @YesterdayShiftStartTime IS NOT NULL
               AND @YesterdayShiftEndTime IS NOT NULL
              -- yesterday
              BEGIN
                  IF ( EXISTS(SELECT *
                              FROM   dbo.humanresourcesshiftattendancerecord
                              WHERE  shiftdate = @Yesterday
                                     AND employeerowid = @EmployeeRowID) )
                    BEGIN
                        IF @ClosestState = 3
                          BEGIN
                              UPDATE sar
                              SET    sar.timeinrowid = @LatestId,
                                     sar.timein = @LatestTime,
                                     sar.shiftid = CASE WHEN @YesterdayShiftId = -1 THEN null ELSE @YesterdayShiftId END,
                                     updatedate = @Today
                              FROM   humanresourcesshiftattendancerecord sar
                                     JOIN humanresourcesattendance new_att
                                       ON new_att.id = @LatestId
                                     LEFT JOIN humanresourcesattendance old_att
                                            ON old_att.id = sar.timeinrowid
                              WHERE  sar.shiftdate = @Yesterday
                                     AND sar.employeerowid = @EmployeeRowID
                                     AND ( sar.timeinrowid IS NULL
                                            OR new_att.authenticationdatetime <=
                                               old_att.authenticationdatetime );
                          END
                        ELSE IF @ClosestState = 4
                          BEGIN
                              --update HumanResourcesShiftAttendanceRecord set TimeOutRowId = @LatestId
                              --where ShiftDate = @Yesterday and EmployeeRowId = @EmployeeRowID
                              UPDATE sar

                              SET    sar.timeoutrowid = @LatestId,
                                     sar.TimeOut = @LatestTime,
                                     sar.shiftid = CASE WHEN @YesterdayShiftId = -1 THEN null ELSE @YesterdayShiftId END,
                                     updatedate = @Today
                              FROM   humanresourcesshiftattendancerecord sar
                                     JOIN humanresourcesattendance new_att
                                       ON new_att.id = @LatestId
                                     LEFT JOIN humanresourcesattendance old_att
                                            ON old_att.id = sar.timeoutrowid
                              WHERE  sar.shiftdate = @Yesterday
                                     AND sar.employeerowid = @EmployeeRowID
                                     AND ( sar.timeoutrowid IS NULL
                                            OR new_att.authenticationdatetime >=
                                               old_att.authenticationdatetime );
                          END
                    END
                  ELSE
                    BEGIN
                        IF @ClosestState = 3
                          BEGIN
                              INSERT INTO humanresourcesshiftattendancerecord
                                          (employeerowid,
                                           shiftid,
                                           nightshift,
                                           shiftdate,
                                           shiftstarttime,
                                           shiftendtime,
                                           timeinrowid,
                                           timein,
                                           insertdate)
                              VALUES      (@EmployeeRowID,
                                           CASE WHEN @YesterdayShiftId = -1 THEN null ELSE @YesterdayShiftId END,
                                           @YesterdayNightShift,
                                           @Yesterday,
                                           @YesterdayShiftStartTime,
                                           @YesterdayShiftEndTime,
                                           @LatestId,
                                           @LatestTime,
                                           @Today)
                          END
                        ELSE IF @ClosestState = 4
                          BEGIN
                              INSERT INTO humanresourcesshiftattendancerecord
                                          (employeerowid,
                                           shiftid,
                                           nightshift,
                                           shiftdate,
                                           shiftstarttime,
                                           shiftendtime,
                                           timeoutrowid,
                                           timeout,
                                           insertdate)
                              VALUES      (@EmployeeRowID,
                                           CASE WHEN @YesterdayShiftId = -1 THEN null ELSE @YesterdayShiftId END,
                                           @YesterdayNightShift,
                                           @Yesterday,
                                           @YesterdayShiftStartTime,
                                           @YesterdayShiftEndTime,
                                           @LatestId,
                                           @LatestTime,
                                           @Today)
                          END
                    END
              END
            ELSE
              BEGIN
                  IF EXISTS (SELECT 1
                             FROM   dbo.humanresourcesshiftattendancerecord
                             WHERE  shiftdate = @LatestDate
                                    AND employeerowid = @EmployeeRowID
                                    AND isactive = 1)
                    BEGIN
                        SELECT @CurrentTimeIn = timein
                        FROM   dbo.humanresourcesshiftattendancerecord
                        WHERE  shiftdate = @LatestDate
                               AND employeerowid = @EmployeeRowID;

                        IF @LatestTime < @CurrentTimeIn
                          BEGIN
                              --UPDATE dbo.humanresourcesshiftattendancerecord
                              --SET    timein = @LatestTime,
                              --       timeoutrowid = @LatestId
                              --WHERE  shiftdate = @LatestDate
                              --       AND employeerowid = @EmployeeRowID;

                              SET @TimeInRowId = (SELECT timeinrowid 
                                FROM dbo.humanresourcesshiftattendancerecord
                                WHERE shiftdate = @LatestDate
                                AND employeerowid = @EmployeeRowID
                                AND isactive = 1)

                                declare @tempTimeIn datetime
                                SET @tempTimeIn = (SELECT timein
                                FROM dbo.humanresourcesshiftattendancerecord
                                WHERE shiftdate = @LatestDate
                                AND employeerowid = @EmployeeRowID
                                AND isactive = 1)

                                UPDATE dbo.humanresourcesshiftattendancerecord
                                SET    timeinrowid   = @LatestId,   
                                       timein = @LatestTime,
                                       timeoutrowid  = @TimeInRowId,   
                                       timeout = @tempTimeIn,
                                       updatedate    = @Today
                                WHERE  shiftdate     = @LatestDate
                                       AND employeerowid = @EmployeeRowID
                                       AND isactive  = 1
                          END
                        ELSE
                          BEGIN
                              SET @TimeOutRowId =
                              (SELECT timeoutrowid
                               FROM   dbo.humanresourcesshiftattendancerecord
                               WHERE  shiftdate = @LatestDate
                                      AND employeerowid = @EmployeeRowID
                                      AND isactive = 1)

                              UPDATE dbo.humanresourcesshiftattendancerecord
                              SET    timein = @CurrentTimeIn,
                                     timeinrowid = @TimeOutRowId,
                                     timeout = @LatestTime,
                                     timeoutrowid = @LatestId
                              WHERE  shiftdate = @LatestDate
                                     AND employeerowid = @EmployeeRowID;
                          END
                    END
                  ELSE
                    BEGIN
                        INSERT INTO dbo.humanresourcesshiftattendancerecord
                                    (timein,
                                     timeinrowid,
                                     shiftdate,
                                     employeerowid,
                                     shiftid)
                        VALUES      (@LatestTime,
                                     @LatestId,
                                     @LatestDate,
                                     @EmployeeRowID,
                                     CASE WHEN @ShiftId = -1 THEN null ELSE @ShiftId END);
                    END
              END

            FETCH next FROM employeeattendancecursor INTO @LatestId, @LatestTime
            ,
            @LatestDate, @EmployeeId;
        END

      CLOSE employeeattendancecursor;

      DEALLOCATE employeeattendancecursor;
  -- Insert statements for trigger here
  END 