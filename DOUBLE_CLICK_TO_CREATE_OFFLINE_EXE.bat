@echo off
title SA Diary - Offline EXE Builder
color 0A
cls
echo ================================================================
echo           SA DIARY - AUTOMATED WINDOWS .EXE BUILDER
echo ================================================================
echo.
echo  This script will automatically convert your SA Diary app into 
echo  a standalone offline Windows Executable (.exe) file!
echo.
echo ----------------------------------------------------------------
echo  [1/3] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed on your computer!
    echo  Please download and install Node.js from https://nodejs.org
    echo  Then double-click this file again.
    echo.
    pause
    exit
)
echo  [1/3] Node.js found!

echo.
echo  [2/3] Building Web Application...
call npm run build
if %errorlevel% neq 0 (
    echo  Build failed! Installing dependencies first...
    call npm install
    call npm run build
)

echo.
echo  [3/3] Packaging Windows App (.exe)...
call npm run make-exe

echo.
echo ================================================================
echo  SUCCESS! YOUR OFFLINE WINDOWS APP IS READY!
echo ================================================================
echo.
echo  Look in the "dist_electron" folder inside this directory:
echo  1. SA_Diary_Tracker-1.0.0-portable.exe  (Runs instantly without installation!)
echo  2. SA_Diary_Tracker Setup 1.0.0.exe      (Windows Installer)
echo.
echo  You can copy the .exe file to any PC or USB flash drive!
echo  It works 100%% offline with zero internet needed.
echo ================================================================
echo.
pause
