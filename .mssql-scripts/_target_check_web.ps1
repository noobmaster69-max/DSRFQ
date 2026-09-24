$web = 'C:\Aizera\DSRFQ\DSRFQ.Web'
$j = Get-Content (Join-Path $web 'appsettings.json') -Raw | ConvertFrom-Json
"appsettings sections: " + ($j.PSObject.Properties.Name -join ', ')
"connection string kept: " + [bool]$j.Data.Default.ConnectionString
"Ballooning: EngineUrl=$($j.Ballooning.EngineUrl) ApiUrl=$($j.Ballooning.ApiUrl) ApiKeySet=$([bool]$j.Ballooning.ApiKey)"
$orig = Get-Content 'C:\Aizera\Backup\web-20260915-1149\appsettings.json' -Raw | ConvertFrom-Json
foreach ($p in $orig.PSObject.Properties.Name) {
    $a = $orig.$p | ConvertTo-Json -Depth 20 -Compress
    $b = $j.$p | ConvertTo-Json -Depth 20 -Compress
    if ($a -ne $b) { "CHANGED section: $p" }
}
"compared every original section"
