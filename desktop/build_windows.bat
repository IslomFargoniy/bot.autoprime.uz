@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        AutoPrime LMS Desktop - Windows Release Build
echo ========================================================

:: 1. Flutter Dependencies
echo [1/4] Paketlar yuklanmoqda...
call flutter pub get
if %errorlevel% neq 0 (
    echo Xatolik: flutter pub get bajarilmadi!
    pause
    exit /b %errorlevel%
)

:: 2. Flutter Windows Release Build
echo [2/4] Windows Release dastur yig'ilmoqda...
call flutter build windows --release
if %errorlevel% neq 0 (
    echo Xatolik: Windows build bajarilmadi!
    pause
    exit /b %errorlevel%
)

:: 3. Prepare Staging & Check for Inno Setup Compiler
echo [3/4] Installer (.exe) tayyorlanmoqda...
if not exist "..\public\downloads\desktop" mkdir "..\public\downloads\desktop"
if exist "installer_source" rmdir /s /q "installer_source"
mkdir "installer_source"

if exist "build\windows\x64\runner\Release" (
    xcopy /E /I /Y "build\windows\x64\runner\Release\*" "installer_source\"
) else if exist "build\windows\runner\Release" (
    xcopy /E /I /Y "build\windows\runner\Release\*" "installer_source\"
)

if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
    "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" windows_installer.iss
    echo [OK] Installer muvaffaqiyatli yaratildi: ..\public\downloads\desktop\AutoPrime-Setup-1.0.0.exe
) else if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" (
    "%ProgramFiles%\Inno Setup 6\ISCC.exe" windows_installer.iss
    echo [OK] Installer muvaffaqiyatli yaratildi: ..\public\downloads\desktop\AutoPrime-Setup-1.0.0.exe
) else (
    echo [Eslatma] Inno Setup 6 topilmadi. Standalone Release papkasi tayyor: installer_source
)
if exist "installer_source" rmdir /s /q "installer_source"

:: 4. Serverga yuklash eslatmasi
echo ========================================================
echo [4/4] TAYYOR!
echo Yangi .exe faylni serverga yuklash uchun quyidagi buyruqni bering:
echo scp ..\public\downloads\desktop\AutoPrime-Setup-*.exe root@193.181.213.60:/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz/public/downloads/desktop/
echo ========================================================

pause
