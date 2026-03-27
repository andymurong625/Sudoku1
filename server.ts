import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { generateGame, Difficulty, Board } from "./src/sudokuLogic";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const PORT = 3000;

  // Multiplayer state
  interface Player {
    id: string;
    ws: WebSocket;
    name: string;
    progress: number; // cells filled correctly
    mistakes: number;
    isReady: boolean;
    finished: boolean;
  }

  interface Room {
    id: string;
    players: Player[];
    difficulty: Difficulty;
    initialBoard: Board | null;
    solution: number[][] | null;
    status: 'waiting' | 'playing' | 'finished';
  }

  const rooms: Map<string, Room> = new Map();

  wss.on("connection", (ws) => {
    let currentPlayer: Player | null = null;
    let currentRoom: Room | null = null;

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "JOIN_ROOM": {
          const { roomId, playerName } = message;
          let room = rooms.get(roomId);

          if (!room) {
            room = {
              id: roomId,
              players: [],
              difficulty: 'Medium',
              initialBoard: null,
              solution: null,
              status: 'waiting'
            };
            rooms.set(roomId, room);
          }

          if (room.status !== 'waiting') {
            ws.send(JSON.stringify({ type: "ERROR", message: "Game already in progress" }));
            return;
          }

          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Room is full" }));
            return;
          }

          currentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            ws,
            name: playerName || `Player ${room.players.length + 1}`,
            progress: 0,
            mistakes: 0,
            isReady: false,
            finished: false
          };

          room.players.push(currentPlayer);
          currentRoom = room;

          // Notify room
          broadcastToRoom(room, {
            type: "ROOM_UPDATE",
            room: {
              id: room.id,
              players: room.players.map(p => ({ id: p.id, name: p.name, isReady: p.isReady, progress: p.progress, mistakes: p.mistakes })),
              status: room.status,
              difficulty: room.difficulty
            },
            yourId: currentPlayer.id
          });
          break;
        }

        case "SET_READY": {
          if (!currentPlayer || !currentRoom) return;
          currentPlayer.isReady = message.ready;

          broadcastToRoom(currentRoom, {
            type: "PLAYER_READY",
            playerId: currentPlayer.id,
            ready: currentPlayer.isReady
          });

          // Start game if both ready
          if (currentRoom.players.length === 2 && currentRoom.players.every(p => p.isReady)) {
            const { initial, solution } = generateGame(currentRoom.difficulty);
            currentRoom.initialBoard = initial;
            currentRoom.solution = solution;
            currentRoom.status = 'playing';

            broadcastToRoom(currentRoom, {
              type: "START_GAME",
              initialBoard: initial,
              solution,
              difficulty: currentRoom.difficulty
            });
          }
          break;
        }

        case "UPDATE_PROGRESS": {
          if (!currentPlayer || !currentRoom) return;
          currentPlayer.progress = message.progress;
          currentPlayer.mistakes = message.mistakes;

          broadcastToRoom(currentRoom, {
            type: "OPPONENT_UPDATE",
            playerId: currentPlayer.id,
            progress: currentPlayer.progress,
            mistakes: currentPlayer.mistakes
          });

          // Check for win
          if (currentPlayer.progress === 81 && !currentPlayer.finished) {
            currentPlayer.finished = true;
            broadcastToRoom(currentRoom, {
              type: "PLAYER_FINISHED",
              playerId: currentPlayer.id,
              name: currentPlayer.name
            });

            // If everyone finished, end game
            if (currentRoom.players.every(p => p.finished)) {
              currentRoom.status = 'finished';
            }
          }
          break;
        }

        case "SET_DIFFICULTY": {
          if (!currentRoom || currentRoom.status !== 'waiting') return;
          currentRoom.difficulty = message.difficulty;
          broadcastToRoom(currentRoom, {
            type: "DIFFICULTY_UPDATE",
            difficulty: currentRoom.difficulty
          });
          break;
        }
      }
    });

    ws.on("close", () => {
      if (currentRoom && currentPlayer) {
        currentRoom.players = currentRoom.players.filter(p => p.id !== currentPlayer!.id);
        if (currentRoom.players.length === 0) {
          rooms.delete(currentRoom.id);
        } else {
          broadcastToRoom(currentRoom, {
            type: "PLAYER_LEFT",
            playerId: currentPlayer.id
          });
          // If game was playing, end it or notify
          if (currentRoom.status === 'playing') {
            broadcastToRoom(currentRoom, { type: "OPPONENT_DISCONNECTED" });
          }
        }
      }
    });
  });

  function broadcastToRoom(room: Room, message: any) {
    const data = JSON.stringify(message);
    room.players.forEach(p => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(data);
      }
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
