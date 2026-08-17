param(
    [string]$Output = ".\deploy\publish\monsterasp-api",
    [string]$Zip = ".\deploy\publish\atelier-api-monsterasp.zip"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$outputPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Output))
$zipPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Zip))
$publishRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "deploy\publish"))

if (-not $outputPath.StartsWith($publishRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Output must stay under deploy\publish."
}

if (-not $zipPath.StartsWith($publishRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Zip must stay under deploy\publish."
}

New-Item -ItemType Directory -Force -Path $publishRoot | Out-Null

if (Test-Path $outputPath) {
    Remove-Item -LiteralPath $outputPath -Recurse -Force
}

dotnet publish `
    (Join-Path $repoRoot "atelier-backend\Atelier.API\Atelier.API.csproj") `
    -c Release `
    /p:UseAppHost=false `
    -o $outputPath

if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed with exit code $LASTEXITCODE."
}

$exampleSettings = Join-Path $repoRoot "atelier-backend\Atelier.API\appsettings.example.json"
$publishedSettings = Join-Path $outputPath "appsettings.json"
Copy-Item -LiteralPath $exampleSettings -Destination $publishedSettings -Force

$monsterExample = Join-Path $repoRoot "deploy\monsterasp-backend.appsettings.Production.example.json"
Copy-Item -LiteralPath $monsterExample -Destination (Join-Path $outputPath "appsettings.Production.example.json") -Force

$monsterLocal = Join-Path $repoRoot "deploy\monsterasp-backend.appsettings.Production.local.json"
if (Test-Path $monsterLocal) {
    Copy-Item -LiteralPath $monsterLocal -Destination (Join-Path $outputPath "appsettings.Production.json") -Force
    Write-Host "Included appsettings.Production.json from deploy\monsterasp-backend.appsettings.Production.local.json"
} else {
    Write-Warning "No deploy\monsterasp-backend.appsettings.Production.local.json found. Create appsettings.Production.json before uploading to MonsterASP.NET."
}

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $outputPath "*") -DestinationPath $zipPath -Force

Write-Host "Publish folder: $outputPath"
Write-Host "Zip package: $zipPath"
