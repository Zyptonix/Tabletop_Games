import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { RoomManager } from "./rooms/RoomManager";
import { createSocketServer } from "./socket";

async function main() {
  const manager = new RoomManager();
  const app = createApp(manager);
  const httpServer = createServer(app);

  createSocketServer(httpServer, manager);

  httpServer.listen(env.SERVER_PORT, () => {
    console.log(`Tabletop server listening on ${env.SERVER_PORT}.`);
  });

  try {
    const restoredCount = await manager.restoreActiveRooms();
    if (restoredCount > 0) {
      console.log(`Restored ${restoredCount} active rooms from snapshot.`);
    }
  } catch (error) {
    console.warn(
      "Warning: Could not connect to database to restore active rooms. Make sure PostgreSQL is running at 127.0.0.1:55432 if you need persistence.",
      error instanceof Error ? error.message : error
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
