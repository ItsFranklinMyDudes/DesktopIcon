@echo off
setlocal enabledelayedexpansion

echo Script started - looking for matching icons...
echo ==============================================

:: Get the directory where this script is located (for the icons)
set "iconPath=%~dp0"
:: Remove trailing backslash from path
set "iconPath=%iconPath:~0,-1%"

:: Check which Desktop folder exists
set "oneDriveDesktop=%USERPROFILE%\OneDrive\Desktop"
set "regularDesktop=%USERPROFILE%\Desktop"

if exist "%oneDriveDesktop%" (
    echo OneDrive Desktop folder detected
    set "targetPath=%oneDriveDesktop%"
) else (
    if exist "%regularDesktop%" (
        echo Regular Desktop folder detected
        set "targetPath=%regularDesktop%"
    ) else (
        echo No Desktop folder found at standard locations
        echo Tried: "%oneDriveDesktop%"
        echo Tried: "%regularDesktop%"
        echo.
        echo Press any key to exit.
        pause > nul
        exit /b 1
    )
)

echo Looking for shortcuts on: %targetPath%
echo Using icons from: %iconPath%
echo.

echo Processing .lnk shortcut files...
:: Loop through all .lnk files in the target path
set lnkCount=0
for %%L in ("%targetPath%\*.lnk") do (
    set /a lnkCount+=1
    set "fileName=%%~nL"
    set "filePath=%%~fL"
    set "icoFile=%iconPath%\!fileName!.ico"
    
    if exist "!icoFile!" (
        echo Found icon for: "%%~nL" - updating...
        call :SetIconLnk "!filePath!" "!icoFile!"
    ) else (
        echo No matching icon found for: "%%~nL"
    )
)

if %lnkCount%==0 (
    echo No .lnk files found on desktop
)

echo.
echo Processing .url shortcut files...
:: Loop through all .url files in the target path
set urlCount=0
for %%U in ("%targetPath%\*.url") do (
    set /a urlCount+=1
    set "fileName=%%~nU"
    set "filePath=%%~fU"
    set "icoFile=%iconPath%\!fileName!.ico"
    
    if exist "!icoFile!" (
        echo Found icon for: "%%~nU" - updating...
        call :SetIconUrl "!filePath!" "!icoFile!"
    ) else (
        echo No matching icon found for: "%%~nU"
    )
)

if %urlCount%==0 (
    echo No .url files found on desktop
)

echo.
echo ==============================================
echo Summary: Processed %lnkCount% .lnk files and %urlCount% .url files
echo.
echo Done! Press any key to exit.
pause > nul
exit /b

:: Function to set icon for .lnk files using PowerShell
:SetIconLnk
:: %1 = Shortcut path
:: %2 = Icon path

:: Create a temporary PowerShell script
echo $sh = New-Object -ComObject WScript.Shell > "%TEMP%\seticon_lnk.ps1"
echo $lnk = $sh.CreateShortcut('%~1') >> "%TEMP%\seticon_lnk.ps1"
echo $lnk.IconLocation = '%~2' >> "%TEMP%\seticon_lnk.ps1"
echo $lnk.Save() >> "%TEMP%\seticon_lnk.ps1"

:: Execute the temporary script
powershell -nologo -executionpolicy bypass -file "%TEMP%\seticon_lnk.ps1"
if %ERRORLEVEL% EQU 0 (
    echo Successfully updated icon for .lnk shortcut
) else (
    echo Failed to update icon for .lnk shortcut
)
exit /b

:: Function to set icon for .url files
:SetIconUrl
:: %1 = URL shortcut path
:: %2 = Icon path

:: Create a temporary PowerShell script
echo $urlFile = '%~1' > "%TEMP%\seticon_url.ps1"
echo $iconPath = '%~2' >> "%TEMP%\seticon_url.ps1"
echo $content = Get-Content -Path $urlFile -ErrorAction Stop >> "%TEMP%\seticon_url.ps1"
echo $hasIconLine = $false >> "%TEMP%\seticon_url.ps1"
echo foreach ($line in $content) { >> "%TEMP%\seticon_url.ps1"
echo   if ($line -like 'IconFile=*') { >> "%TEMP%\seticon_url.ps1"
echo     $hasIconLine = $true >> "%TEMP%\seticon_url.ps1"
echo   } >> "%TEMP%\seticon_url.ps1"
echo } >> "%TEMP%\seticon_url.ps1"
echo if ($hasIconLine) { >> "%TEMP%\seticon_url.ps1"
echo   $content = $content -replace 'IconFile=.*', ('IconFile=' + $iconPath) >> "%TEMP%\seticon_url.ps1"
echo } else { >> "%TEMP%\seticon_url.ps1"
echo   $content += 'IconFile=' + $iconPath >> "%TEMP%\seticon_url.ps1"
echo } >> "%TEMP%\seticon_url.ps1"
echo Set-Content -Path $urlFile -Value $content -ErrorAction Stop >> "%TEMP%\seticon_url.ps1"

:: Execute the temporary script
powershell -nologo -executionpolicy bypass -file "%TEMP%\seticon_url.ps1"
if %ERRORLEVEL% EQU 0 (
    echo Successfully updated icon for .url shortcut
) else (
    echo Failed to update icon for .url shortcut
)
exit /b