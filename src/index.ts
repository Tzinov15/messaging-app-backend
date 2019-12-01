import dotenv from "dotenv";
import express from "express";
import moment from "moment";
import morgan from "morgan";
import winston from "winston";
import * as WebSocket from "ws";
import { toUnicode } from "punycode";

export interface IMessageData {
  username: string;
  date: string;
  msg: string;
  avatarURL: string;
}

export interface ICustomWebSocket extends WebSocket {
  url: string;
  avatar: string;
  username: string;
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
  wss.clients.forEach(client => {
    console.log(client.url); // ie: /?username=jijnov
  });
  res.send("Hello world!");
});

// start the Express server
const server = app.listen(9191, "0.0.0.0", () => {
  logger.info(`server started at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

// TODO: Write suites of unit tests for the below 3 functions to make sure they handle all possible edge cases of inputs
const getUsernameFromSocketURL = (url: string) =>
  url.split("username=")[1].split("&avatarURL=")[0];
const getAvatarFromSocketURL = (url: string) => url.split("avatarURL=")[1];
const reduceSocketsToUsers = (sockets: Set<any>) =>
  Array.from(sockets).reduce((arr, currSocket) => {
    arr.push({
      avatar: getAvatarFromSocketURL(currSocket.url),
      username: getUsernameFromSocketURL(currSocket.url)
    });
    return arr;
  }, []);

const broadcastToClientsNewConnectedClientList = (
  wss: WebSocket.Server,
  ws: ICustomWebSocket,
  updateType: "CONNECT" | "DISCONNECT"
) => {
  logger.info(`The ${getUsernameFromSocketURL(ws.url)} has ${updateType}!`);
  const usersOfAllClients = reduceSocketsToUsers(wss.clients);
  logger.info(
    `Currently connected clients: ${JSON.stringify(usersOfAllClients)}`
  );
  wss.clients.forEach(client => {
    client.send(
      JSON.stringify({
        action: `CLIENT_${updateType}`,
        users: usersOfAllClients
      })
    );
  });
};

wss.on("connection", (ws: ICustomWebSocket, req) => {
  ws.url = String(req.url);
  ws.username = String(getAvatarFromSocketURL(ws.url));
  ws.avatar = String(getAvatarFromSocketURL(ws.url));
  broadcastToClientsNewConnectedClientList(wss, ws, "CONNECT");
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

  ws.on("close", data => {
    broadcastToClientsNewConnectedClientList(wss, ws, "DISCONNECT");
  });
});
