@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "ENV_DIR=%ROOT%.conda"
set "CONDA_BAT=%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"
if not exist "%CONDA_BAT%" set "CONDA_BAT=%USERPROFILE%\miniforge3\condabin\conda.bat"
cd /d "%ROOT%"
if not exist "%CONDA_BAT%" (
  echo ERROR: Miniforge activation script was not found in either location:
  echo   "%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"
  echo   "%USERPROFILE%\miniforge3\condabin\conda.bat"
  goto :end
)
call "%CONDA_BAT%" activate "%ENV_DIR%"
if errorlevel 1 (
  echo ERROR: Failed to activate Conda environment "%ENV_DIR%".
  goto :end
)

REM Ensure PostgreSQL is running on 127.0.0.1:55432
if exist "%ROOT%.pgdata\PG_VERSION" (
  pg_ctl -D "%ROOT%.pgdata" status >nul 2>&1
  if errorlevel 1 (
    echo PostgreSQL is not running. Starting local database on 127.0.0.1:55432...
    pg_ctl -D "%ROOT%.pgdata" -l "%ROOT%postgres.log" -o "-p 55432 -h 127.0.0.1" start
    if errorlevel 1 (
      echo WARNING: Failed to start PostgreSQL. Check postgres.log.
    ) else (
      echo PostgreSQL started successfully.
    )
  )
)

echo Starting Tabletop Arena backend. Keep this window open.
call corepack pnpm --filter @tabletop/server start
echo.
echo Backend process exited. Review any errors above.
:end
echo Press any key to close this window.
pause >nul
