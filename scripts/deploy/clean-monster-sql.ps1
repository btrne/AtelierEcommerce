param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$source = [System.IO.Path]::GetFullPath($InputPath)
if (-not (Test-Path -LiteralPath $source)) {
    throw "Input file not found: $source"
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $directory = Split-Path -Parent $source
    $name = [System.IO.Path]::GetFileNameWithoutExtension($source)
    $OutputPath = Join-Path $directory "$name.monster.sql"
}

$target = [System.IO.Path]::GetFullPath($OutputPath)
$lines = Get-Content -LiteralPath $source

$start = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Object:\s+ Table ") {
        $start = $i
        break
    }
}

$end = $lines.Count - 1
for ($i = $start; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*USE\s+\[master\]") {
        $end = $i - 1
        break
    }
}

$body = $lines[$start..$end] | Where-Object {
    $_ -notmatch "^\s*USE\s+\[[^\]]+\]\s*$" -and
    $_ -notmatch "^\s*ALTER\s+DATABASE\s+" -and
    $_ -notmatch "^\s*CREATE\s+DATABASE\s+" -and
    $_ -notmatch "FULLTEXTSERVICEPROPERTY" -and
    $_ -notmatch "sp_fulltext_database"
}

$clean = @(
    "-- Cleaned for MonsterASP.NET import.",
    "-- Run inside the existing db64085 database.",
    "-- Removed CREATE DATABASE, ALTER DATABASE, full-text setup, and USE statements."
) + $body

Set-Content -LiteralPath $target -Value $clean -Encoding UTF8

Write-Host "Cleaned SQL file: $target"
