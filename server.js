const express = require("express");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

let users = {};
let leaderboard = [];


io.of("/api/user").on("connection",(socket)=>{
    // console.log("socket.io: User connected - Player: ", socket.id);

    let user = socket.handshake.query?.user && socket.handshake.query?.user != "anonymous"
    ? socket.handshake.query?.user
    : socket.id;

    
socket.on('update_score',(data)=>{
    console.log(data);
    const existingUserIndex = leaderboard.findIndex((driver) => driver.name === data.name);
    leaderboard[existingUserIndex].score+=5;

    io.of("/api/socket").emit('leaderboard_update', leaderboard);
})

   

    // console.log(socket.handshake.query)

  // Check if user already exists in leaderboard
  const existingUserIndex = leaderboard.findIndex((driver) => driver.name === user);

  if (existingUserIndex > -1) {
    // If user exists, update the socket ID
    users[socket.id] = leaderboard[existingUserIndex].name; // Map new socket ID to existing user
  } else {
    // If user does not exist, add to leaderboard
    users[socket.id] = user; // Map socket ID to the new user
    leaderboard.push({
      name: user,
      score: 0,
    });
  }

  io.of("/api/socket").emit('leaderboard_update', leaderboard);

  socket.on('set_username', (data) => {
    // console.log(data);
    // Update the leaderboard and socket mapping
    const existingIndex = leaderboard.findIndex((driver) => driver.name === data);
    
    if (existingIndex > -1) {
      // Update existing user if the username is found
    //   leaderboard[existingIndex].score = 0; // Reset the score or keep it as needed
      users[socket.id] = data; // Map the socket ID to the new username
    } else {
      // Add new user to leaderboard
      leaderboard.push({
        name: data,
        score: 0,
      });
      users[socket.id] = data; // Map the socket ID to the new user
    }
  });

  socket.on("disconnect", () => {
    console.log("socket.io: User disconnected: ", socket.id);

    // Clean up users mapping
    users = Object.keys(users).reduce((object, key) => {
      if (key !== socket.id) {
        object[key] = users[key];
      }
      return object;
    }, {});
    
    delete users[socket.id];
    io.of("/api/socket").emit("online", users);
  });
})

// Send the initial leaderboard when a user connects
io.of("/api/socket").on("connection", (socket) => {
console.log("socket.io: User connected: ", socket.id);

 

  io.of("/api/socket").emit("online", users);

  // Send initial leaderboard
  socket.emit('leaderboard_update', leaderboard);

  socket.on('request_initial_leaderboard', () => {
    socket.emit('leaderboard_update', leaderboard);
  });

  socket.on("disconnect", () => {
    console.log("socket.io: User disconnected: ", socket.id);
    io.of("/api/socket").emit("online", users);
  });

 
});


app.post("/api/scoreboard", async (req, res) => {
  console.log(req.body);
  try {
    console.log(users);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.log(err);
    res.status(201).json({ status: err });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});

module.exports = app;
