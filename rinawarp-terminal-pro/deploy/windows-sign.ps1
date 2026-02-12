Param(
  [Parameter(Mandatory=$true)][string]$FilePath,
  [Parameter(Mandatory=$true)][string]$PfxPath,
  [Parameter(Mandatory=$true)][string]$PfxPassword
)

$SignTool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe"
if (!(Test-Path $SignTool)) { throw "signtool.exe not found at $SignTool" }

& $SignTool sign /f $PfxPath /p $PfxPassword /tr http://timestamp.digicert.com /td sha256 /fd sha256 $FilePath
& $SignTool verify /pa /v $FilePath
Write-Host "Signed OK: $FilePath"
