import dotenv from "dotenv";
import express from "express";
import moment from "moment";
import morgan from "morgan";
import { toUnicode } from "punycode";
import winston from "winston";
import * as WebSocket from "ws";

export interface IMessageData {
  username: string;
  date: string;
  msg: string;
  avatarOptions: string;
}

export interface ICustomWebSocket extends WebSocket {
  url: string;
  avatarOptions: string;
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
  url.split("username=")[1].split("&avatarOptions=")[0];
const getAvatarFromSocketURL = (url: string) => url.split("avatarOptions=")[1];
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
  // logger.info(
  //   `Currently connected clients: ${JSON.stringify(usersOfAllClients)}`
  // );
  wss.clients.forEach(client => {
    client.send(
      JSON.stringify({
        action: `CLIENT_${updateType}`,
        users: usersOfAllClients
      })
    );
  });
};

const findRecipientSocket = (
  clients: ICustomWebSocket[],
  recipient: string
): ICustomWebSocket => {
  const recipientSocket = clients.find(client => client.username === recipient);
  return recipientSocket as ICustomWebSocket;
};

wss.on("connection", (ws: ICustomWebSocket, req) => {
  ws.url = String(req.url);
  ws.username = String(getUsernameFromSocketURL(ws.url));
  ws.avatarOptions = String(getAvatarFromSocketURL(ws.url));
  broadcastToClientsNewConnectedClientList(wss, ws, "CONNECT");
  ws.on("message", data => {
    const messageArrivalTime = moment().format("h:mm:ss:SSS a");
    const incomingData = JSON.parse(data.toString());
    const recipientSocket: ICustomWebSocket = findRecipientSocket(
      Array.from(wss.clients as Set<ICustomWebSocket>),
      incomingData.recipient
    );
    const decodedAvatarOptionsJSON = JSON.parse(
      decodeURI(recipientSocket.avatarOptions)
    );
    const messageData = JSON.stringify({
      action: "USER_MESSAGE",
      author: incomingData.author,
      avatarOptions: decodedAvatarOptionsJSON,
      date: messageArrivalTime,
      msg: incomingData.msg,
      recipient: recipientSocket.username
    });

    ws.send(
      JSON.stringify({
        ...incomingData,
        action: "USER_MESSAGE",
        date: messageArrivalTime
      })
    );

    console.log("SENDING TO " + recipientSocket);
    recipientSocket.send(messageData);
  });

  ws.on("close", data => {
    broadcastToClientsNewConnectedClientList(wss, ws, "DISCONNECT");
  });
});
