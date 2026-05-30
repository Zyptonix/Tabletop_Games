# Reconnects And Snapshots

## Identity

`userId` is permanent. `socketId` is temporary.

The server never treats `socketId` as a seat, player, hand, role, score, money, or team identity.

## Disconnect

When a socket disconnects:

- the player remains in the room
- their seat is reserved
- game state remains unchanged
- hidden state remains owned by their `userId`
- the player is marked disconnected only when all their sockets are gone
- other players see the disconnected status

## Reconnect

When the player returns:

- socket authenticates via session cookie
- server finds an active room containing the `userId`
- new `socketId` is attached
- player becomes connected
- server sends room state
- server sends the viewer-specific private game state
- other players see a reconnect event

This tolerates refreshes, browser crashes, mobile sleep, Wi-Fi drops, and new Cloudflare Tunnel URLs as long as the Node server keeps running.

## Snapshots

Snapshots are JSON rows in `RoomSnapshot`.

The server saves:

- serializable room metadata
- game state
- action number
- game ID

Classic turn-based games can snapshot after each valid action. The save is asynchronous so it does not block the realtime emit path.

On server startup, unfinished rooms with snapshots are restored with all players disconnected until they log in again.

If the Cloudflare Tunnel dies, create a new tunnel link. Players log in through the new URL and rejoin their saved room.
