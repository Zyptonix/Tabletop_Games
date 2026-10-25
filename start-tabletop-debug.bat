@echo on
setlocal EnableExtensions
set "ROOT=%~dp0"
set "ENV_DIR=%ROOT%.conda"
set "CONDA_BAT=%USERPROFILE%\miniforge3\condabin\conda.bat"
if not exist "%CONDA_BAT%" set "CONDA_BAT=%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"

echo.
echo ==========================================
echo   Tabletop Arena - Windows LAN startup
echo ==========================================
echo.

if not exist "%ROOT%package.json" (
  echo ERROR: package.json was not found beside this script.
  echo Put these scripts in the Tabletop_Games project root.
  goto :fail
)
if not exist "%ROOT%.env" (
  echo ERROR: Root .env file was not found.
  echo Create it from .env.example and configure it first.
  goto :fail
)
if not exist "%ROOT%apps\web\.env.local" (
  echo ERROR: apps\web\.env.local was not found.
  echo Create it with the LAN API/socket URLs before starting.
  echo Example:
  echo NEXT_PUBLIC_API_BASE_URL=http://YOUR_PC_LAN_IP:4000
  echo NEXT_PUBLIC_SOCKET_URL=http://YOUR_PC_LAN_IP:4000
  echo NEXT_PUBLIC_SERVER_URL=http://YOUR_PC_LAN_IP:4000
  echo NEXT_PUBLIC_SOCKET_PATH=/socket.io
  goto :fail
)
if not exist "%ENV_DIR%\conda-meta" (
  echo ERROR: Project Conda environment was not found at:
  echo   "%ENV_DIR%"
  goto :fail
)
if not exist "%CONDA_BAT%" (
  echo ERROR: Miniforge activation script was not found in either location:
  echo   "%USERPROFILE%\miniforge3\condabin\conda.bat"
  echo   "%USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat"
  echo Edit CONDA_BAT in this file if Miniforge is installed elsewhere.
  goto :fail
)
if not exist "%ROOT%.pgdata\PG_VERSION" (
  echo ERROR: PostgreSQL data folder was not initialized:
  echo   "%ROOT%.pgdata"
  goto :fail
)

pushd "%ROOT%"
call "%CONDA_BAT%" activate "%ENV_DIR%"
if errorlevel 1 (
  echo ERROR: Could not activate the project's Conda environment.
  goto :fail_pop
)

echo [1/4] Checking PostgreSQL...
pg_ctl -D "%ROOT%.pgdata" status >nul 2>&1
if errorlevel 1 (
  echo PostgreSQL is stopped. Starting it on 127.0.0.1:55432...
  pg_ctl -D "%ROOT%.pgdata" -l "%ROOT%postgres.log" -o "-p 55432 -h 127.0.0.1" start
  if errorlevel 1 (
    echo ERROR: PostgreSQL failed to start. See postgres.log.
    goto :fail_pop
  )
) else (
  echo PostgreSQL is already running.
)

echo Checking the tabletop_arena database...
psql -w -h 127.0.0.1 -p 55432 -U postgres -d tabletop_arena -v ON_ERROR_STOP=1 -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
  echo ERROR: Cannot connect to tabletop_arena on port 55432.
  echo Verify .env and the PostgreSQL database. No database was reset.
  goto :fail_pop
)

echo [2/4] Building the production frontend...
call corepack pnpm --filter @tabletop/web build
if errorlevel 1 (
  echo ERROR: Frontend build failed. Fix the build error before starting.
  goto :fail_pop
)

echo [3/4] Opening the backend terminal...
start "Tabletop Arena - Backend" "%ComSpec%" /k ""%ROOT%run-tabletop-backend.bat""
timeout /t 2 /nobreak >nul

echo [4/4] Opening the frontend terminal...
start "Tabletop Arena - Frontend" "%ComSpec%" /k ""%ROOT%run-tabletop-frontend.bat""

echo.
echo Startup commands have been launched.
echo Keep both app terminal windows open.
echo Website: http://localhost:3000
echo LAN site: use your hosting PC's IPv4 address on port 3000.
echo PostgreSQL is bound to 127.0.0.1:55432, not the LAN.
echo.
popd
pause
exit /b 0

:fail_pop
popd
:fail
echo.
pause
exit /b 1

