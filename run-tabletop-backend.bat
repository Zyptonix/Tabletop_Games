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
echo Starting Tabletop Arena backend. Keep this window open.
call corepack pnpm --filter @tabletop/server start
echo.
echo Backend process exited. Review any errors above.
:end
echo Press any key to close this window.
pause >nul
