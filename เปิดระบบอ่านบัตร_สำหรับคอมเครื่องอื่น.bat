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
echo [OK] กำลังเริ่มบริการอ่านบัตรประชาชน (พอร์ต 8181)...
echo.
echo * ท่านสามารถเปิดเว็บแอป OPD บน Vercel หรือเบราว์เซอร์ได้ทันที
echo * เมื่อเสียบบัตรประชาชน ระบบจะอ่านข้อมูลอัตโนมัติ
echo * กรุณา "เปิดหน้าต่างสีดำนี้ทิ้งไว้" ตลอดเวลาที่ใช้งานระบบ
echo ===================================================================
echo.

:: Check CardReader.exe and compile if missing
if not exist "%~dp0CardReader.exe" (
    echo [INFO] กำลังจัดเตรียม CardReader.exe...
    if exist "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:exe /optimize+ /out:"%~dp0CardReader.exe" "%~dp0CardReader.cs" >nul 2>&1
    ) else if exist "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
        "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" /target:exe /optimize+ /out:"%~dp0CardReader.exe" "%~dp0CardReader.cs" >nul 2>&1
    )
)

:: Run CardReader.exe
if exist "%~dp0CardReader.exe" (
    "%~dp0CardReader.exe" --server 8181
) else (
    echo [ERROR] ไม่พบไฟล์ CardReader.exe กรุณาตรวจสอบไฟล์ในโฟลเดอร์
)

echo.
echo [คำแนะนำ] หากบริการปิดตัวลง กรุณาคลิกขวาที่ไฟล์นี้แล้วเลือก "Run as administrator"
echo.
pause
