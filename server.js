const express = require("express"); const http = require("http"); const { Server } = require("socket.io"); const crypto = require("crypto"); const path = require("path");

const app = express(); const server = http.createServer(app); const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public")); app.use(express.json());

// ================= FUNÇÕES ================= function gerarId() { return crypto.randomBytes(3).toString("hex"); }

function limitarTexto(texto) { return String(texto || "") .trim() .slice(0, 300); }

// ================= CHAT AO VIVO ================= const lastMsg = new Map();

io.on("connection", (socket) => { socket.userId = gerarId(); socket.roomAtual = null;

// Entrar em sala via hash (#000, #123 etc) socket.on("joinRoom", (room) => { if (!room) return;

room = String(room).trim().slice(0, 50);

if (socket.roomAtual) {
  socket.leave(socket.roomAtual);
  io.to(socket.roomAtual).emit("userLeft");
}

socket.join(room);
socket.roomAtual = room;

socket.emit("joined", {
  room,
  id: socket.userId
});

socket.to(room).emit("userJoined");

const total = io.sockets.adapter.rooms.get(room)?.size || 1;
io.to(room).emit("online", total);

});

// Mensagens em tempo real (não salva) socket.on("msg", ({ room, texto }) => { if (!room || !texto) return;

const agora = Date.now();
const ultimo = lastMsg.get(socket.id) || 0;

// anti-spam simples
if (agora - ultimo < 800) return;

lastMsg.set(socket.id, agora);

const mensagem = limitarTexto(texto);
if (!mensagem) return;

io.to(room).emit("msg", {
  id: socket.userId,
  texto: mensagem,
  time: new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  })
});

});

socket.on("disconnect", () => { if (socket.roomAtual) { socket.to(socket.roomAtual).emit("userLeft");

setTimeout(() => {
    const total = io.sockets.adapter.rooms.get(socket.roomAtual)?.size || 0;
    io.to(socket.roomAtual).emit("online", total);
  }, 300);
}

lastMsg.delete(socket.id);

}); });

// ================= ROTAS ================= app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "public", "chat-anonimo.html")); });

// ================= START ================= const PORT = process.env.PORT || 3000;

server.listen(PORT, () => { console.log("Servidor online na porta " + PORT); });
