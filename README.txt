TABLETOP ARENA - NATIVE WINDOWS LAN STARTUP SCRIPTS

INSTALL
1. Extract/copy all four .bat files into the Tabletop_Games project root,
   next to package.json and docker-compose.yml.
2. Confirm .env exists in the project root.
3. Confirm apps\web\.env.local exists and has your current hosting PC LAN IP,
   for example:
     NEXT_PUBLIC_API_BASE_URL=http://172.21.224.169:4000
     NEXT_PUBLIC_SOCKET_URL=http://172.21.224.169:4000
     NEXT_PUBLIC_SERVER_URL=http://172.21.224.169:4000
     NEXT_PUBLIC_SOCKET_PATH=/socket.io
   Replace the IP with your actual LAN IPv4 address. Do not put database
   credentials or secrets in this file.
4. These scripts expect Miniforge at:
   %USERPROFILE%\AppData\Local\miniforge3\condabin\conda.bat
   If yours is installed elsewhere, edit CONDA_BAT in each script.

START
Double-click start-tabletop.bat.
It activates the project Conda environment, starts PostgreSQL on localhost
port 55432 if needed, verifies the database, rebuilds the production frontend,
and opens separate backend and frontend terminal windows.
Keep all three services running while playing. PostgreSQL runs in the background; the web and backend have their own windows.

STOP
First press Ctrl+C in the backend and frontend windows and confirm termination
if prompted. Then run stop-tabletop-postgres.bat to stop PostgreSQL cleanly.

NOTES
- This is a local helper script pack; it does not modify application source.
- It does not create firewall rules or expose PostgreSQL to the LAN.
- If the PC's LAN IP changes, update apps\web\.env.local and rebuild by running
  start-tabletop.bat again.
- The frontend is built every time start-tabletop.bat runs, so startup may take
  a minute or two. This ensures current NEXT_PUBLIC_* values are included.
