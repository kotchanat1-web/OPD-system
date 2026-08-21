@echo off
title Smart Card Reader Bridge - คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
chcp 65001 >nul
color 0A
cls
echo ===================================================================
echo     โปรแกรมเชื่อมต่อเครื่องอ่านบัตรประชาชน (Smart Card Bridge)
echo     คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
echo ===================================================================
echo.

:: Check and build CardReader.exe if missing
if not exist "%~dp0CardReader.exe" (
    echo [INFO] กำลังคอมไพล์ CardReader.exe...
    if exist "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:exe /out:"%~dp0CardReader.exe" "%~dp0CardReader.cs" >nul 2>&1
    ) else if exist "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
        "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" /target:exe /out:"%~dp0CardReader.exe" "%~dp0CardReader.cs" >nul 2>&1
    )
)

echo [INFO] กำลังเริ่มต้นบริการอ่านบัตรประชาชนที่พอร์ต 8181...
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] พบ Node.js ในเครื่อง กำลังเริ่ม Bridge ผ่าน Node.js...
    node "%~dp0smartcard-bridge.js"
    if %errorlevel% neq 0 (
        echo.
        echo [WARN] สลับไปใช้ CardReader.exe --server อัตโนมัติ...
        "%~dp0CardReader.exe" --server
    )
) else (
    echo [OK] กำลังเริ่ม Bridge ผ่าน CardReader.exe --server...
    "%~dp0CardReader.exe" --server
)

echo.
echo [INFO] บริการอ่านบัตรปิดตัวลงแล้ว
pause
