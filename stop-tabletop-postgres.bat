@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "ENV_DIR=%ROOT%.conda"
set "CONDA_BAT=%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"
cd /d "%ROOT%"
if not exist "%CONDA_BAT%" (
  echo ERROR: Miniforge activation script was not found: "%CONDA_BAT%"
  goto :end
)
call "%CONDA_BAT%" activate "%ENV_DIR%"
if errorlevel 1 (
  echo ERROR: Failed to activate Conda environment "%ENV_DIR%".
  goto :end
)
echo Close/stop the frontend and backend terminals before stopping PostgreSQL.
pg_ctl -D "%ROOT%.pgdata" status >nul 2>&1
if errorlevel 1 (
  echo PostgreSQL is already stopped.
) else (
  pg_ctl -D "%ROOT%.pgdata" stop -m fast
)
:end
echo.
pause
