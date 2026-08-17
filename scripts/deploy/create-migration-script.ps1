[CmdletBinding()]
param(
    [string]$OutputPath = "deploy/sql/atelier-idempotent.sql",
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$fullOutputPath = Join-Path $repoRoot $OutputPath
$outputDirectory = Split-Path -Parent $fullOutputPath

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

Push-Location $repoRoot
try {
    dotnet ef migrations script `
        --idempotent `
        --configuration $Configuration `
        --context ApplicationDbContext `
        --project ".\atelier-backend\Atelier.Infrastructure\Atelier.Infrastructure.csproj" `
        --startup-project ".\atelier-backend\Atelier.API\Atelier.API.csproj" `
        --output $fullOutputPath

    Write-Host "Migration script generated: $fullOutputPath"
}
finally {
    Pop-Location
}
