@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "ENV_DIR=%ROOT%.conda"
set "CONDA_BAT=%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"
if not exist "%CONDA_BAT%" set "CONDA_BAT=%USERPROFILE%\miniforge3\condabin\conda.bat"

echo.
echo ==========================================
echo   Tabletop Arena - DEV / HOT RELOAD MODE
echo ==========================================
echo.

if not exist "%ROOT%package.json" (
  echo ERROR: package.json was not found beside this script.
  echo Save this file in the repository root, beside start-tabletop.bat.
  goto :fail
)
if not exist "%ROOT%.env" (
  echo ERROR: Root .env file was not found.
  goto :fail
)
if not exist "%ROOT%apps\web\.env.local" (
  echo ERROR: apps\web\.env.local was not found.
  goto :fail
)
if not exist "%ENV_DIR%\conda-meta" (
  echo ERROR: Project Conda environment not found at:
  echo   "%ENV_DIR%"
  goto :fail
)
if not exist "%CONDA_BAT%" (
  echo ERROR: Miniforge activation script was not found in either location:
  echo   "%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"
  echo   "%USERPROFILE%\miniforge3\condabin\conda.bat"
  goto :fail
)
if not exist "%ROOT%.pgdata\PG_VERSION" (
  echo ERROR: PostgreSQL data folder was not found at:
  echo   "%ROOT%.pgdata"
  echo This project launcher expects the local database setup used by start-tabletop.bat.
  goto :fail
)

pushd "%ROOT%"
call "%CONDA_BAT%" activate "%ENV_DIR%"
if errorlevel 1 (
  echo ERROR: Could not activate the project's Conda environment.
  goto :fail_pop
)

echo Running DEVELOPMENT mode, not the production build.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:4000
echo LAN users can connect to your PC's IPv4 address on port 3000.
echo.
echo Next.js Fast Refresh will update most CSS and TSX changes automatically.
echo Do not run start-tabletop.bat at the same time.
echo Close the production Frontend/Backend windows first if they are running.
echo Press Ctrl+C in this window to stop the dev stack.
echo.
call corepack pnpm dev:all:no-tunnel
set "EXIT_CODE=%ERRORLEVEL%"
popd
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Development stack exited with code %EXIT_CODE%.
  echo Check logs\dev\all.log and logs\dev\web.log / server.log.
)
echo.
pause
exit /b %EXIT_CODE%

:fail_pop
popd
:fail
echo.
pause
exit /b 1
