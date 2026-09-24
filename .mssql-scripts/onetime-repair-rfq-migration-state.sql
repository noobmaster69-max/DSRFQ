-- Purpose: Make the deskdev `RFQ` database startable by DSRFQ.Web.
--
-- The database was provisioned by scripting a schema in rather than by running
-- FluentMigrator, so dbo.VersionInfo is empty. On startup DataMigrations sees no
-- applied migrations, replays DefaultDB_20141103_1400_Initial, and dies on
-- "There is already an object named 'Users'".
--
-- Three things to fix:
--   1. Two Users columns the scripted schema missed (the 2017 TwoFactorAuth
--      migration). Oddly TwoFactorData (2024) and MobilePhoneNumber are already
--      there, so only these two are genuinely absent.
--   2. Stamp all seven migrations as applied so FluentMigrator stops replaying.
--   3. Seed the admin login — Users and Roles are both empty, so there is no way
--      in. Hash and salt are copied verbatim from the Initial migration, i.e.
--      the stock Serenity credentials admin / serenity. CHANGE THE PASSWORD.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

-- 1 ── Missing Users columns ────────────────────────────────────────────────
IF COL_LENGTH('dbo.Users', 'MobilePhoneVerified') IS NULL
    ALTER TABLE dbo.Users
        ADD MobilePhoneVerified BIT NOT NULL
            CONSTRAINT DF_Users_MobilePhoneVerified DEFAULT (0);
GO

IF COL_LENGTH('dbo.Users', 'TwoFactorAuth') IS NULL
    ALTER TABLE dbo.Users ADD TwoFactorAuth INT NULL;
GO

-- 2 ── Migration bookkeeping ────────────────────────────────────────────────
-- Versions come from [MigrationKey(...)] in Migrations/DefaultDB/*.cs, but the
-- attribute value is NOT the version FluentMigrator records. MigrationKey pads
-- to a 14-digit yyyyMMddHHmmss, so 20141103_1400 becomes 20141103140000 — as
-- confirmed by the runner's own banner: "20141103140000: ..._Initial migrating".
-- Getting this wrong silently leaves the migration unstamped and it replays.
-- Clean up the 12-digit values an earlier run of this script inserted. Listed
-- explicitly rather than by magnitude so a correct 14-digit row can never match.
DELETE FROM dbo.VersionInfo WHERE Version IN (
    201411031400, 201411111130, 201605150726, 201610291300,
    201703040852, 201807031110, 202409301359);

INSERT INTO dbo.VersionInfo (Version, AppliedOn, Description)
SELECT v.Version, SYSUTCDATETIME(), v.Description
FROM (VALUES
    (CAST(20141103140000 AS bigint), 'DefaultDB_20141103_1400_Initial'),
    (20141111113000, 'DefaultDB_20141111_1130_Permissions'),
    (20160515072600, 'DefaultDB_20160515_0726_UserPreferences'),
    (20161029130000, 'DefaultDB_20161029_1300_ExceptionLog'),
    (20170304085200, 'DefaultDB_20170304_0852_TwoFactorAuth'),
    (20180703111000, 'DefaultDB_20180703_1110_RoleKey'),
    (20240930135900, 'DefaultDB_20240930_1359_TwoFactorData')
) AS v(Version, Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.VersionInfo x WHERE x.Version = v.Version);
GO

-- 3 ── Admin login ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin')
    INSERT INTO dbo.Users
        (Username, DisplayName, Email, Source, PasswordHash, PasswordSalt,
         InsertDate, InsertUserId, IsActive)
    VALUES
        ('admin', 'admin', 'admin@localhost.com', 'site',
         'rfqpSPYs0ekFlPyvIRTXsdhE/qrTHFF+kKsAUla7pFkXL4BgLGlTe89GDX5DBysenMDj8AqbIZPybqvusyCjwQ',
         'hJf_F',
         '2014-01-01', 1, 1);
GO

-- Languages is empty too; the Initial migration seeds English and the UI needs
-- at least one row to render its language picker.
IF NOT EXISTS (SELECT 1 FROM dbo.Languages WHERE LanguageId = 'en')
    INSERT INTO dbo.Languages (LanguageId, LanguageName) VALUES ('en', 'English');
GO

-- Verify
SELECT 'VersionInfo rows'  AS Item, CAST(COUNT(*) AS varchar(10)) AS Value FROM dbo.VersionInfo
UNION ALL SELECT 'Users rows',      CAST(COUNT(*) AS varchar(10)) FROM dbo.Users
UNION ALL SELECT 'Languages rows',  CAST(COUNT(*) AS varchar(10)) FROM dbo.Languages
UNION ALL SELECT 'TwoFactorAuth col', IIF(COL_LENGTH('dbo.Users','TwoFactorAuth') IS NULL, 'MISSING', 'present')
UNION ALL SELECT 'MobilePhoneVerified col', IIF(COL_LENGTH('dbo.Users','MobilePhoneVerified') IS NULL, 'MISSING', 'present');
GO
