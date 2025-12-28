import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { OmokGame } from "./lib/game/omok";
import { getToken } from "next-auth/jwt";
import { parse } from "url";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    const { pathname } = parsedUrl;

    if (pathname === "/lobby" || pathname?.startsWith("/game/")) {
      // Manually parse cookies for getToken
      const cookieHeader = req.headers.cookie || "";
      const cookies: Record<string, string> = {};
      cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        const name = parts[0]?.trim();
        const value = parts.slice(1).join("=").trim();
        if (name && value) cookies[name] = decodeURIComponent(value);
      });
      (req as any).cookies = cookies;

      const token = await getToken({
        req: req as any,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        const callbackUrl = encodeURIComponent(req.url!);
        res.writeHead(302, { Location: `/login?callbackUrl=${callbackUrl}` });
        res.end();
        return;
      }
    }

    await handler(req, res, parsedUrl);
  });
  const io = new Server(httpServer);

  const games = new Map<string, OmokGame>();
  const roomPlayers = new Map<string, { black?: string; white?: string }>();
  const roomSettings = new Map<
    string,
    {
      name: string;
      password?: string;
      allowSpectators: boolean;
      hostId: string;
    }
  >();
  const socketData = new Map<
    string,
    { roomId: string; userName: string; role: string; dbUserId: string }
  >();

  const getRoomList = async () => {
    const roomList = [];
    console.log(
      `[Server] Generating roomList. Total roomPlayers entries: ${roomPlayers.size}`
    );

    for (const [roomId, players] of roomPlayers.entries()) {
      const settings = roomSettings.get(roomId);
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

      console.log(
        `[Server] Room ${roomId}: size=${roomSize}, black=${players.black}, white=${players.white}`
      );

      roomList.push({
        id: roomId,
        name: settings?.name || `${roomId.slice(0, 4)}번 방`,
        hasPassword: !!settings?.password,
        allowSpectators: settings?.allowSpectators ?? true,
        playerCount: roomSize,
        black: players.black,
        white: players.white,
      });
    }
    console.log(`[Server] Generated ${roomList.length} rooms`);
    return roomList;
  };

  const updateRoomStatus = async (roomId: string) => {
    if (!roomId) return;
    const players = roomPlayers.get(roomId) || {};

    const participants: { name: string; role: string; id: string }[] = [];
    const sockets = await io.in(roomId).fetchSockets();

    for (const s of sockets) {
      const data = socketData.get(s.id);
      if (data) {
        participants.push({ name: data.userName, role: data.role, id: s.id });
      }
    }

    console.log(
      `[Room ${roomId}] Status Update: ${sockets.length} users, Black: ${players.black}, White: ${players.white}`
    );

    io.to(roomId).emit("room-status", {
      playerCount: sockets.length,
      blackPlayer: players.black,
      whitePlayer: players.white,
      participants,
    });

    // Broadcast to lobby
    io.to("lobby").emit("room-list", await getRoomList());
  };

  const broadcastRoomList = async () => {
    const list = await getRoomList();
    console.log(
      `[Server] Broadcasting room list to ${
        io.sockets.adapter.rooms.get("lobby")?.size || 0
      } users in lobby`
    );
    io.to("lobby").emit("room-list", list);
  };

  const cleanupTimeouts = new Map<string, NodeJS.Timeout>();

  io.on("connection", (socket) => {
    console.log(`[Socket ${socket.id}] Connected`);

    socket.on("track-user", async ({ dbUserId, userName }) => {
      // Cancel pending cleanup if any
      if (cleanupTimeouts.has(dbUserId)) {
        clearTimeout(cleanupTimeouts.get(dbUserId));
        cleanupTimeouts.delete(dbUserId);
        console.log(`[User ${userName}] Reconnected, cleanup cancelled.`);
      }

      socket.join("lobby");
      socketData.set(socket.id, {
        roomId: "",
        userName,
        role: "spectator",
        dbUserId,
      });
      console.log(`[Socket ${socket.id}] Tracking user ${userName}`);

      // Send initial room list to the user in lobby
      socket.emit("room-list", await getRoomList());
    });

    socket.on("get-rooms", async () => {
      const list = await getRoomList();
      socket.emit("room-list", list);
    });

    socket.on(
      "join-room",
      async ({ roomId: rawRoomId, userName, dbUserId, metadata }) => {
        const roomId = String(rawRoomId);
        if (!roomId) return;

        // Initialize or update settings if metadata provided (first joiner/creator)
        if (metadata && !roomSettings.has(roomId)) {
          console.log(`[Room ${roomId}] Created by ${userName} (${dbUserId})`);
          roomSettings.set(roomId, {
            name: metadata.name || `${roomId.slice(0, 4)}번 방`,
            password: metadata.password,
            allowSpectators: metadata.allowSpectators !== false,
            hostId: dbUserId, // Track the creator
          });
        }

        const settings = roomSettings.get(roomId);

        // Check password if entering after creation
        if (settings?.password && metadata?.password !== settings.password) {
          // If they are not already in the room (checking socketData)
          const existingData = socketData.get(socket.id);
          if (existingData?.roomId !== roomId) {
            const message = !metadata?.password
              ? "비밀번호를 입력해주세요."
              : "비밀번호가 일치하지 않습니다.";

            socket.emit("error", {
              message,
              type: "AUTH_REQUIRED",
            });
            return;
          }
        }

        console.log(
          `[Socket ${socket.id}] Joining room ${roomId} as ${userName}`
        );

        if (!roomPlayers.has(roomId)) {
          roomPlayers.set(roomId, {});
        }
        const players = roomPlayers.get(roomId)!;

        // Handle role assignment and spectator restrictions
        let role: "black" | "white" | "spectator" = "spectator";
        if (!players.black) {
          role = "black";
          players.black = userName;
        } else if (!players.white) {
          role = "white";
          players.white = userName;
        } else {
          // Both player slots filled, try to join as spectator
          if (settings?.allowSpectators === false) {
            socket.emit("error", { message: "관전이 허용되지 않은 방입니다." });
            return;
          }
          role = "spectator";
        }

        socketData.set(socket.id, { roomId, userName, role, dbUserId });
        await socket.join(roomId);
        socket.emit("role-assigned", role);

        if (!games.has(roomId)) {
          games.set(roomId, new OmokGame());
        }

        const game = games.get(roomId)!;
        socket.emit("game-state", {
          board: game.board,
          currentPlayer: game.currentPlayer,
          lastMove: game.moves[game.moves.length - 1] || null,
          winner: game.winner,
          roomName: settings?.name,
          allowSpectators: settings?.allowSpectators ?? true,
          hostId: settings?.hostId,
        });

        await updateRoomStatus(roomId);
        await broadcastRoomList();
      }
    );

    socket.on("place-stone", ({ roomId: rawRoomId, x, y }) => {
      const roomId = String(rawRoomId);
      const game = games.get(roomId);
      const data = socketData.get(socket.id);

      if (!game || !data) {
        socket.emit("error", { message: "게임을 진행할 수 없습니다." });
        return;
      }

      if (data.role !== game.currentPlayer) {
        socket.emit("error", { message: "상대방의 차례입니다." });
        return;
      }

      if (game.placeStone(x, y)) {
        io.to(roomId).emit("stone-placed", {
          x,
          y,
          player: game.board[y][x],
          nextPlayer: game.currentPlayer,
        });

        if (game.winner) {
          io.to(roomId).emit("game-ended", {
            winner: game.winner,
            moves: game.moves,
          });
        }
      } else {
        socket.emit("error", { message: "잘못된 오목 수입니다." });
      }
    });

    socket.on("change-role", ({ roomId: rawRoomId, newRole }) => {
      const roomId = String(rawRoomId);
      const data = socketData.get(socket.id);
      if (!data) {
        console.log(`[Socket ${socket.id}] No data found for role change`);
        return;
      }

      console.log(
        `[Socket ${socket.id}] Attempting role change: ${data.role} -> ${newRole}`
      );

      if (!roomPlayers.has(roomId)) {
        roomPlayers.set(roomId, {});
      }
      const players = roomPlayers.get(roomId)!;

      // Check availability
      if (
        newRole === "black" &&
        players.black &&
        players.black !== data.userName
      ) {
        socket.emit("error", { message: "이미 흑돌 자리가 찼습니다." });
        return;
      }
      if (
        newRole === "white" &&
        players.white &&
        players.white !== data.userName
      ) {
        socket.emit("error", { message: "이미 백돌 자리가 찼습니다." });
        return;
      }

      // Cleanup old role if they were black or white
      if (data.role === "black") delete players.black;
      if (data.role === "white") delete players.white;

      // Assign new role
      if (newRole === "black") players.black = data.userName;
      if (newRole === "white") players.white = data.userName;

      data.role = newRole;
      data.roomId = roomId; // Ensure roomId is synced

      socket.emit("role-assigned", newRole);
      console.log(`[Socket ${socket.id}] Successfully changed to ${newRole}`);

      updateRoomStatus(roomId);
    });

    socket.on("reset-game", (rawRoomId) => {
      const roomId = String(rawRoomId);
      const game = new OmokGame();
      games.set(roomId, game);
      const settings = roomSettings.get(roomId);
      io.to(roomId).emit("game-state", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        lastMove: null,
        winner: null,
        roomName: settings?.name,
        allowSpectators: settings?.allowSpectators ?? true,
        hostId: settings?.hostId,
      });
      io.to(roomId).emit("game-reset");
    });

    socket.on("kick-user", async ({ roomId, targetId }) => {
      const settings = roomSettings.get(String(roomId));
      const requester = socketData.get(socket.id);

      if (!settings || !requester || settings.hostId !== requester.dbUserId) {
        socket.emit("error", { message: "권한이 없습니다." });
        return;
      }

      console.log(`[Room ${roomId}] Kicking user socket ${targetId}`);
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit("kicked", "방장에 의해 강퇴되었습니다.");
        targetSocket.leave(String(roomId));

        // Cleanup target data logic similar to disconnect
        const data = socketData.get(targetId);
        if (data) {
          // Reset their room data
          data.roomId = "";
          data.role = "spectator";

          const players = roomPlayers.get(String(roomId));
          if (players) {
            if (players.black === data.userName) delete players.black;
            if (players.white === data.userName) delete players.white;
          }
        }
        await updateRoomStatus(String(roomId));
      }
    });

    socket.on("delete-room", async (roomId) => {
      const rId = String(roomId);
      const settings = roomSettings.get(rId);
      const requester = socketData.get(socket.id);

      if (!settings || !requester || settings.hostId !== requester.dbUserId) {
        socket.emit("error", { message: "권한이 없습니다." });
        return;
      }

      console.log(`[Room ${rId}] Deleted by host`);
      // Notify all users
      io.to(rId).emit("room-closed", "방장이 방을 삭제했습니다.");

      // Force leave all sockets
      const sockets = await io.in(rId).fetchSockets();
      for (const s of sockets) {
        s.leave(rId);
        const d = socketData.get(s.id);
        if (d) {
          d.roomId = "";
          d.role = "spectator";
        }
      }

      // Cleanup server state
      games.delete(rId);
      roomPlayers.delete(rId);
      roomSettings.delete(rId);

      await broadcastRoomList();
    });

    socket.on(
      "update-room-settings",
      async ({ roomId, name, password, allowSpectators }) => {
        const rId = String(roomId);
        const settings = roomSettings.get(rId);
        const requester = socketData.get(socket.id);

        if (!settings || !requester || settings.hostId !== requester.dbUserId) {
          socket.emit("error", { message: "권한이 없습니다." });
          return;
        }

        // Update settings
        if (name) settings.name = name;
        // Allow clearing password by sending empty string? let's assume if provided
        if (password !== undefined) settings.password = password;
        if (allowSpectators !== undefined)
          settings.allowSpectators = allowSpectators;

        // Broadcast update to room
        const game = games.get(rId)!;
        io.to(rId).emit("game-state", {
          board: game.board,
          currentPlayer: game.currentPlayer,
          lastMove: game.moves[game.moves.length - 1] || null,
          winner: game.winner,
          roomName: settings.name,
          allowSpectators: settings.allowSpectators,
          hostId: settings.hostId,
        });

        // Broadcast to lobby (name/lock status might change)
        await broadcastRoomList();
      }
    );

    socket.on("disconnect", async () => {
      const data = socketData.get(socket.id);
      if (data) {
        const { roomId, role, dbUserId, userName } = data;
        console.log(`[Socket ${socket.id}] ${userName} disconnected`);

        if (roomId) {
          const players = roomPlayers.get(roomId);
          if (players) {
            if (role === "black" && players.black === userName)
              delete players.black;
            if (role === "white" && players.white === userName)
              delete players.white;
          }
          await updateRoomStatus(roomId);

          // Auto cleanup empty rooms
          const remainingSockets = await io.in(roomId).fetchSockets();
          if (remainingSockets.length === 0) {
            games.delete(roomId);
            roomPlayers.delete(roomId);
            roomSettings.delete(roomId);
            console.log(`[Room ${roomId}] Deleted (Empty)`);
          }
          await broadcastRoomList();
        }

        socketData.delete(socket.id);

        const otherSockets = Array.from(socketData.values()).filter(
          (d) => d.dbUserId === dbUserId
        );
        if (otherSockets.length === 0) {
          // Schedule cleanup with grace period (e.g. 5 seconds)
          console.log(`[User ${userName}] Scheduling cleanup in 5s...`);
          const timeout = setTimeout(async () => {
            // Double check in case they reconnected cleanly on another socket/protocol
            // (Though track-user should have cleared this timeout)
            try {
              const { prisma } = await import("./lib/prisma");
              await prisma.user.delete({ where: { id: dbUserId } });
              console.log(
                `[User ${dbUserId}] Deleted from DB (Ephemeral Policy)`
              );
              cleanupTimeouts.delete(dbUserId);
            } catch (e: any) {
              if (e.code === "P2025") {
                // User already deleted, ignore
                console.log(
                  `[User ${dbUserId}] Already deleted or not found (P2025)`
                );
              } else {
                console.error(`Failed to delete user ${dbUserId}`, e);
              }
            }
          }, 5000);
          cleanupTimeouts.set(dbUserId, timeout);
        }
      }
    });
  });

  httpServer
    .once("error", (err: unknown) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
