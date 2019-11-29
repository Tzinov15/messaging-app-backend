import dotenv from "dotenv";
import express from "express";
import moment from "moment";
import morgan from "morgan";
import winston from "winston";
import * as WebSocket from "ws";

export interface IMessageData {
  username: string;
  date: string;
  msg: string;
  avatarURL: string;
}

const app = express();
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "server.log" })
  ]
});

dotenv.config();
const port = process.env.SERVER_PORT;

app.use(morgan("dev"));

// define a route handler for the default home page
app.get("/", (req, res) => {
  res.send("Hello world!");
});

// start the Express server
const server = app.listen(9191, "0.0.0.0", () => {
  logger.info(`server started at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  ws.on("message", data => {
    const incomingData = JSON.parse(data.toString());
    const messageData = JSON.stringify({
      avatarURL: incomingData.avatarURL,
      date: moment().format("h:mm:ss a"),
      msg: incomingData.msg,
      username: incomingData.username
    });
    ws.send(messageData);
    wss.clients.forEach(client => {
      if (client !== ws) {
        client.send(messageData);
      }
    });
  });
  ws.send(
    JSON.stringify({
      avatarURL:
        "https://avataaars.io/?avatarStyle=Circle&topType=NoHair&accessoriesType=Blank&facialHairType=Blank&clotheType=Hoodie&clotheColor=Black&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Tanned",
      date: moment().format("h:mm:ss a"),
      msg: "Hi there, I am a WebSocket server",
      username: "SERVER"
    })
  );
});
