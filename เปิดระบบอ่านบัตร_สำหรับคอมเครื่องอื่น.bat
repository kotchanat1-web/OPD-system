@echo off
title Smart Card Reader Bridge - คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์
chcp 65001 >nul
color 0A
cls
echo ===================================================================
echo     โปรแกรมเชื่อมต่อเครื่องอ่านบัตรประชาชน (Smart Card Bridge)
echo     คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์ (สำหรับคอมพิวเตอร์ทุกเครื่อง)
echo ===================================================================
echo.

:: 1. Check CardReader.exe
if not exist "%~dp0CardReader.exe" (
    echo [INFO] กำลังคอมไพล์ CardReader.exe...
    if exist "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:exe /optimize+ /out:"%~dp0CardReader.exe" "%~dp0CardReader.cs" >nul 2>&1
    ) else if exist "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
        "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" /target:exe /optimize+ /out:"%~dp0CardReader.exe" "%~dp0CardReader.cs" >nul 2>&1
    )
)

echo [OK] กำลังเริ่มบริการอ่านบัตรประชาชน (พอร์ต 8181 - รองรับ WebSocket + Vercel)...
echo.
echo * ท่านสามารถเปิดเว็บแอป OPD บน Vercel หรือเบราว์เซอร์ได้ทันที
echo * เมื่อเสียบบัตรประชาชน ระบบจะอ่านข้อมูลอัตโนมัติ
echo.
echo ===================================================================

where node >nul 2>nul
if %errorlevel% equ 0 (
    if exist "%~dp0smartcard-bridge.js" (
        node "%~dp0smartcard-bridge.js"
        goto end
    )
)

"%~dp0CardReader.exe" --server 8181

:end
echo.
echo [INFO] บริการอ่านบัตรประชาชนปิดตัวลงแล้ว
pause
