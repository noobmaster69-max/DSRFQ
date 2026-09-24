<#
    The credentials that must not travel in the artefact, and where they live.

    Found by searching the tree, not from memory: the SMTP app password and a
    Stripe key sit in appsettings.json, the SQL password is in its connection
    string, and the same plaintext aihubmix API key is repeated across six
    Python files - three in new_tsh's CAM engine, and one each in
    REPLACE-api-v2, table-recognize-3parts and table-to-json.

    Rules are applied by 11-publish-payload.ps1 before packing. Probes are then
    run over the scrubbed tree, and publishing is REFUSED if any still match -
    so a file that gets reformatted, and stops matching its rule, fails loudly
    rather than shipping the secret.

    Prompts are what 15-secrets.ps1 asks for on the target and writes back.
    Anything not answered stays a placeholder, and the service that needs it
    fails with a clear message rather than a puzzling one.
#>
@{
    Rules = @(
        @{
            Name        = 'SQL Server password'
            Files       = @('DSRFQ\DSRFQ.Web\appsettings.json')
            Pattern     = 'Password=[^";]*'
            Replacement = 'Password=__SQL_PASSWORD__'
        }
        @{
            Name        = 'SMTP app password'
            Files       = @('DSRFQ\DSRFQ.Web\appsettings.json')
            # Only inside the mail block: the connection string's Password= is
            # handled above and must not be caught twice.
            Pattern     = '("Password"\s*:\s*")[^"]*(")'
            Replacement = '${1}__SMTP_PASSWORD__${2}'
        }
        @{
            Name        = 'Stripe secret key'
            Files       = @('DSRFQ\DSRFQ.Web\appsettings.json')
            Pattern     = 'sk_(test|live)_[A-Za-z0-9]+'
            Replacement = '__STRIPE_SECRET_KEY__'
        }
        @{
            Name        = 'aihubmix API key'
            Files       = @(
                'RPA\new_tsh\cam2d_engine\final_solution_generator.py'
                'RPA\new_tsh\cam2d_engine\shape_analyzer.py'
                'RPA\new_tsh\cam2d_engine\process_analyzer.py'
                'RPA\REPLACE-api-v2\REPLACE-api-v2\config.py'
                'RPA\table-recognize-3parts\config.py'
                'RPA\table-to-json\main.py'
            )
            Pattern     = 'sk-[A-Za-z0-9]{20,}'
            Replacement = '__AIHUBMIX_API_KEY__'
        }
        # RPA\RFQ\config.yaml carries FOUR credentials, not one. Two of them are
        # both spelled "Password:", so those are scoped to their block rather
        # than matched by key - a bare ^\s*Password: rule would rewrite the
        # MySQL one with the web login and neither would work.
        @{
            Name        = 'RFQ consumer - SQL Server password'
            Files       = @('RPA\RFQ\config.yaml')
            # "Pwd:" is unique in this file.
            Pattern     = '(?m)^(\s*Pwd\s*:\s*).*$'
            Replacement = '${1}__SQL_PASSWORD__'
        }
        @{
            Name        = 'RFQ consumer - MySQL password'
            Files       = @('RPA\RFQ\config.yaml')
            # The first Password: after the CostingDatabase: header, and no
            # further: (?s). is lazy, so it stops at that block's own key.
            Pattern     = '(?ms)^(CostingDatabase:.*?^\s*Password\s*:\s*).*?$'
            Replacement = '${1}__MYSQL_PASSWORD__'
        }
        @{
            Name        = 'RFQ consumer - DSRFQ web login'
            Files       = @('RPA\RFQ\config.yaml')
            Pattern     = '(?ms)^(DSRFQ:.*?^\s*Password\s*:\s*").*?(")'
            Replacement = '${1}__DSRFQ_PASSWORD__${2}'
        }
        @{
            Name        = 'RFQ consumer - TSH portal password'
            Files       = @('RPA\RFQ\config.yaml')
            # No trailing $: these files are CRLF, and in .NET a multiline $
            # matches before the \n - i.e. AFTER the \r - so `"$` never matches
            # a quoted value at end of line. The closing quote is anchor enough.
            Pattern     = '(?m)^(\s*TshPassword\s*:\s*").*?(")'
            Replacement = '${1}__TSH_PASSWORD__${2}'
        }
    )

    # Run over the scrubbed tree. A hit here stops the publish.
    #
    # The known values are probed for by name as well as by shape. A pattern
    # rule that stops matching - because a file was reformatted, or a key
    # renamed - is exactly the failure that publishes a credential, and it is
    # invisible unless something looks for the value itself.
    Probes = @(
        @{ Name = 'Stripe key';    Pattern = 'sk_(test|live)_[A-Za-z0-9]{20,}'; Include = @('*.json') }
        @{ Name = 'aihubmix key';  Pattern = 'sk-[A-Za-z0-9]{20,}';             Include = @('*.py', '*.json', '*.yaml') }
        @{ Name = 'SQL password';  Pattern = 'Tsh9989';                         Include = @('*.json', '*.yaml', '*.py', '*.config') }
        @{ Name = 'MySQL password';Pattern = 'Welcome01';                       Include = @('*.json', '*.yaml', '*.py') }
        @{ Name = 'SMTP password'; Pattern = 'kcdw hypb';                       Include = @('*.json') }
        # As a KEY/VALUE pair, not the bare word: "serenity" is the name of the
        # framework and appears in prose all over these files - a probe for the
        # word alone fails the publish on a comment.
        @{ Name = 'DSRFQ web login'; Pattern = '(?i)password\s*[:=]\s*"?serenity"?'; Include = @('*.yaml', '*.json', '*.py') }
    )

    # What the target is asked for, and where each answer is written.
    Prompts = @(
        @{
            Token   = '__SQL_PASSWORD__'
            Label   = 'SQL Server password (for the RFQ database)'
            Secret  = $true
            Files   = @('DSRFQ\DSRFQ.Web\appsettings.json', 'RPA\RFQ\config.yaml')
            Required = $true
        }
        @{
            Token   = '__MYSQL_PASSWORD__'
            Label   = 'MySQL password (tsh_new, used by costing)'
            Secret  = $true
            Files   = @('RPA\RFQ\config.yaml')
            # Not optional in practice: without it costing fails while every
            # status chip on the grid still reads healthy. Required so the
            # install stops here rather than three stages later.
            Required = $true
        }
        @{
            Token   = '__DSRFQ_PASSWORD__'
            Label   = 'DSRFQ web login the consumer signs in with'
            Secret  = $true
            Files   = @('RPA\RFQ\config.yaml')
            Required = $true
        }
        @{
            Token   = '__TSH_PASSWORD__'
            Label   = 'TSH portal password (leave blank if unused)'
            Secret  = $true
            Files   = @('RPA\RFQ\config.yaml')
            Required = $false
        }
        @{
            Token   = '__SMTP_PASSWORD__'
            Label   = 'SMTP app password (leave blank to disable outgoing mail)'
            Secret  = $true
            Files   = @('DSRFQ\DSRFQ.Web\appsettings.json')
            Required = $false
        }
        @{
            Token   = '__STRIPE_SECRET_KEY__'
            Label   = 'Stripe secret key (leave blank if billing is unused)'
            Secret  = $true
            Files   = @('DSRFQ\DSRFQ.Web\appsettings.json')
            Required = $false
        }
        @{
            Token   = '__AIHUBMIX_API_KEY__'
            Label   = 'aihubmix API key (CAM analysis and drawing replacement)'
            Secret  = $true
            Files   = @(
                'RPA\new_tsh\cam2d_engine\final_solution_generator.py'
                'RPA\new_tsh\cam2d_engine\shape_analyzer.py'
                'RPA\new_tsh\cam2d_engine\process_analyzer.py'
                'RPA\REPLACE-api-v2\REPLACE-api-v2\config.py'
                'RPA\table-recognize-3parts\config.py'
                'RPA\table-to-json\main.py'
            )
            Required = $false
        }
    )
}
