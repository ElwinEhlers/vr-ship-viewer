const express = require("express");
const path = require("node:path");
const http = require("node:http");

process.title = "vr-ship-server";

const port = process.env.PORT || 3000;
const maxOccupantsInRoom = 50;

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const webServer = http.createServer(app);
const io = require("socket.io")(webServer);

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  let curRoom = null;

  socket.on("joinRoom", (data) => {
    const { room } = data;

    curRoom = room;
    let roomInfo = rooms.get(room);
    if (!roomInfo) {
      roomInfo = {
        name: room,
        occupants: {},
        occupantsCount: 0
      };
      rooms.set(room, roomInfo);
    }

    if (roomInfo.occupantsCount >= maxOccupantsInRoom) {
      let availableRoomFound = false;
      const roomPrefix = `${room}--`;
      let numberOfInstances = 1;
      for (const [roomName, roomData] of rooms.entries()) {
        if (roomName.startsWith(roomPrefix)) {
          numberOfInstances++;
          if (roomData.occupantsCount < maxOccupantsInRoom) {
            availableRoomFound = true;
            curRoom = roomName;
            roomInfo = roomData;
            break;
          }
        }
      }

      if (!availableRoomFound) {
        const newRoomNumber = numberOfInstances + 1;
        curRoom = `${roomPrefix}${newRoomNumber}`;
        roomInfo = {
          name: curRoom,
          occupants: {},
          occupantsCount: 0
        };
        rooms.set(curRoom, roomInfo);
      }
    }

    const joinedTime = Date.now();
    roomInfo.occupants[socket.id] = joinedTime;
    roomInfo.occupantsCount++;

    console.log(`${socket.id} joined room ${curRoom}`);
    socket.join(curRoom);

    socket.emit("connectSuccess", { joinedTime });
    const occupants = roomInfo.occupants;
    io.in(curRoom).emit("occupantsChanged", { occupants });
  });

  socket.on("send", (data) => {
    io.to(data.to).emit("send", data);
  });

  socket.on("broadcast", (data) => {
    socket.to(curRoom).emit("broadcast", data);
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id, curRoom);
    const roomInfo = rooms.get(curRoom);
    if (roomInfo) {
      delete roomInfo.occupants[socket.id];
      roomInfo.occupantsCount--;
      const occupants = roomInfo.occupants;
      socket.to(curRoom).emit("occupantsChanged", { occupants });

      if (roomInfo.occupantsCount === 0) {
        console.log("everybody left room", curRoom);
        rooms.delete(curRoom);
      }
    }
  });
});

webServer.listen(port, () => {
  console.log("VR Server läuft auf Port " + port);
});
