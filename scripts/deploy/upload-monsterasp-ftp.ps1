param(
    [string]$LocalPath = ".\deploy\publish\monsterasp-api",
    [string]$Server = "site85625.siteasp.net",
    [string]$User = "site85625",
    [string]$RemoteRoot = "/wwwroot",
    [switch]$EnableSsl
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$resolvedLocal = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $LocalPath))

if (-not (Test-Path -LiteralPath $resolvedLocal)) {
    throw "Local publish folder not found: $resolvedLocal"
}

$password = Read-Host "FTP password for $User@$Server" -AsSecureString
$credential = New-Object System.Net.NetworkCredential($User, $password)

function Convert-ToFtpPath([string]$path) {
    $normalized = $path.Trim("\", "/") -replace "\\", "/"
    if ([string]::IsNullOrWhiteSpace($normalized)) {
        return ""
    }

    return (($normalized -split "/") | ForEach-Object {
        [System.Uri]::EscapeDataString($_)
    }) -join "/"
}

function Get-RelativePathCompat([string]$basePath, [string]$fullPath) {
    $baseFullPath = [System.IO.Path]::GetFullPath($basePath).TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
    $targetFullPath = [System.IO.Path]::GetFullPath($fullPath)

    if (-not $targetFullPath.StartsWith($baseFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "File is outside local upload folder: $targetFullPath"
    }

    return $targetFullPath.Substring($baseFullPath.Length)
}

function New-FtpRequest([string]$uri, [string]$method) {
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Method = $method
    $request.Credentials = $credential
    $request.UseBinary = $true
    $request.UsePassive = $true
    $request.KeepAlive = $false
    $request.EnableSsl = [bool]$EnableSsl
    return $request
}

function Ensure-RemoteDirectory([string]$remoteDirectory) {
    $parts = $remoteDirectory.Trim("/") -split "/" | Where-Object { $_ }
    $current = ""

    foreach ($part in $parts) {
        $current = "$current/$part"
        $uri = "ftp://$Server$current"
        try {
            $request = New-FtpRequest $uri ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)
            $response = $request.GetResponse()
            $response.Close()
        } catch [System.Net.WebException] {
            # FTP returns an error when the directory already exists. That is fine.
        }
    }
}

$files = Get-ChildItem -LiteralPath $resolvedLocal -File -Recurse
Write-Host "Uploading $($files.Count) files to ftp://$Server$RemoteRoot ..."

Ensure-RemoteDirectory $RemoteRoot

foreach ($file in $files) {
    $relativePath = Get-RelativePathCompat $resolvedLocal $file.FullName
    $relativeFileName = Convert-ToFtpPath ([System.IO.Path]::GetFileName($relativePath))
    $relativeDirectory = Convert-ToFtpPath ([System.IO.Path]::GetDirectoryName($relativePath))
    $remoteDirectory = ("$RemoteRoot/$relativeDirectory").TrimEnd("/")

    Ensure-RemoteDirectory $remoteDirectory

    $uri = "ftp://$Server/$($remoteDirectory.Trim('/'))/$relativeFileName"
    $request = New-FtpRequest $uri ([System.Net.WebRequestMethods+Ftp]::UploadFile)

    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $request.ContentLength = $bytes.Length

    $stream = $request.GetRequestStream()
    try {
        $stream.Write($bytes, 0, $bytes.Length)
    } finally {
        $stream.Close()
    }

    $response = $request.GetResponse()
    $response.Close()
    Write-Host "Uploaded $relativePath"
}

Write-Host "Upload complete."
