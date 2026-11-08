@echo off
setlocal
set "exitCode=1"

pushd "%~dp0.."
if errorlevel 1 goto directoryError

echo ChatterWatch - example-account tests
echo Fictional accounts only. No live Twitch actions.
echo.

"%SystemRoot%\System32\where.exe" deno >nul 2>nul
if errorlevel 1 goto missingDeno

set "stage=Worker scenarios (Chromium and Firefox APIs)"
echo [1/3] %stage%
call deno task test --filter "example accounts"
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" goto failed

set "stage=Default browser UI (Chrome, or CHATTER_BROWSER)"
echo.
echo [2/3] %stage%
call deno task test:ui --filter "example accounts"
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" goto failed

set "stage=Firefox browser UI"
echo.
echo [3/3] %stage%
call deno task test:ui:firefox --filter "example accounts"
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" goto failed

echo.
echo All example-account test suites passed.
goto cleanup

:missingDeno
echo ERROR: Deno 2 was not found on PATH.
echo Install Deno from https://deno.com/ and run this file again.
goto cleanup

:failed
echo.
echo FAILED: %stage% (exit code %exitCode%).
echo See README.md for Chrome/Edge and Playwright Firefox prerequisites.
goto cleanup

:directoryError
echo ERROR: Could not open the repository directory "%~dp0..".
goto finish

:cleanup
popd

:finish
echo.
if /I not "%~1"=="--no-pause" pause
endlocal & exit /b %exitCode%
