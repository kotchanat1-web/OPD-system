$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'OPD_SmartCard_Bridge.lnk'
$vbsPath = Join-Path $scriptDir 'run-silent-bridge.vbs'

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " ติดตั้งบริการอ่านบัตรประชาชนทำงานอัตโนมัติเมื่อเปิดเครื่อง (Windows Startup)" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = $scriptDir
$shortcut.WindowStyle = 7
$shortcut.Description = "OPD Smart Card Reader Bridge Service"
$shortcut.Save()

Write-Host "[OK] ลงทะเบียน Auto-Startup สำเร็จ: $shortcutPath" -ForegroundColor Green
Write-Host ""

# Check if port 8181 is listening
$portListening = Get-NetTCPConnection -LocalPort 8181 -ErrorAction SilentlyContinue
if (-not $portListening) {
    Write-Host "[INFO] กำลังเริ่มต้นบริการเครื่องอ่านบัตรประชาชน (พอร์ต 8181)..." -ForegroundColor Yellow
    Start-Process "wscript.exe" -ArgumentList "`"$vbsPath`"" -WorkingDirectory $scriptDir
    Start-Sleep -Seconds 2
} else {
    Write-Host "[OK] บริการ Smart Card Bridge (พอร์ต 8181) กำลังทำงานอยู่แล้ว" -ForegroundColor Green
}

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] ติดตั้งสำเร็จเรียบร้อย! เครื่องอ่านบัตรจะทำงานอัตโนมัติทุกครั้งที่เปิดคอม" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
