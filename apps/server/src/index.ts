import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { RoomManager } from "./rooms/RoomManager";
import { createSocketServer } from "./socket";

async function main() {
  const manager = new RoomManager();
  const restoredCount = await manager.restoreActiveRooms();
  const app = createApp(manager);
  const httpServer = createServer(app);

  createSocketServer(httpServer, manager);

  httpServer.listen(env.SERVER_PORT, () => {
    console.log(`Tabletop server listening on ${env.SERVER_PORT}. Restored ${restoredCount} rooms.`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
