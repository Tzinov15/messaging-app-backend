import dotenv from "dotenv";
import express from "express";
import moment from "moment";
import mongoose from "mongoose";
import morgan from "morgan";
import winston from "winston";
import * as WebSocket from "ws";

dotenv.config();
const MONGODB_CONNECTION_STRING = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}${process.env.MONGO_PATH}`;

mongoose
  .connect(MONGODB_CONNECTION_STRING)
  .then(result => console.log("connected"))
  .catch(err => {
    throw err;
  });

const MessageSchema = new mongoose.Schema({
  author: String,
  msg: String,
  recipient: String,
  timestamp: String
});

const MessageModel = mongoose.model("message", MessageSchema);

export const ServerAvatarOptions = {
  avatarStyle: "Transparent",
  topType: "Hat",
  accessoriesType: "Round",
  facialHairType: "BeardMagestic",
  facialHairColor: "Black",
  clotheType: "ShirtCrewNeck",
  clotheColor: "Blue",
  eyeType: "Side",
  eyebrowType: "UnibrowNatural",
  mouthType: "Serious",
  skinColor: "Tanned"
};

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
  // Also push the server and their respective avatar as a possible "client" the user can talk to
  usersOfAllClients.push({
    avatar: JSON.stringify(ServerAvatarOptions),
    username: "SERVER"
  });
  // logger.info(
  //   `Currently connected clients: ${JSON.stringify(usersOfAllClients)}`
  // );
  (wss.clients as Set<ICustomWebSocket>).forEach(client => {
    // TODO: Somewhere in here, as part of broadcasting to each client, I would need to wire up the DB call to query message data pertinent to the newly connected userA
    // TODO: Also, not each client can get the same message here. When a client first connects, that client and that client only neeeds to get ITS message history
    // All the other clients simply need to be notified that there is a new user. So in this case, in the wss.clients.forEach, we need to send a special action to the new client that joined the team and give them their message history
    console.log("about to retrieve messages");
    MessageModel.find({
      $or: [{ author: client.username }, { recipient: client.username }]
    })
      .then(messages => console.log("found messages" + messages))
      .catch(err => {
        throw err;
      });
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
  // TODO: Somewhere in here, as part of broadcasting to each client, I would need to wire up the DB call to query message data pertinent to the newly connected user
  broadcastToClientsNewConnectedClientList(wss, ws, "CONNECT");
  ws.on("message", data => {
    const messageArrivalTime = moment().format("h:mm:ss:SSS a");
    const incomingData = JSON.parse(data.toString());
    // If the Client selected the server to 'talk' to, handle it a little differently
    if (incomingData.recipient === "SERVER") {
      ws.send(
        JSON.stringify({
          ...incomingData,
          action: "USER_MESSAGE",
          date: messageArrivalTime
        })
      );
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            action: "USER_MESSAGE",
            author: "SERVER",
            avatarOptions: JSON.stringify(ServerAvatarOptions),
            date: messageArrivalTime,
            msg: "Hi I'm the server!",
            recipient: incomingData.author
          })
        );
      }, 800);
    } else {
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
      }); // TODO: Somewhere in here I would need to wire up the DB call to write data
      // send the message back to the author as well
      const newMessage = new MessageModel({
        author: incomingData.author,
        recipient: incomingData.recipient,
        msg: incomingData.msg,
        timestamp: messageArrivalTime
      });
      console.log("about to save db message");
      newMessage
        .save()
        .then(result => console.log("Saved Message!" + result))
        .catch(err => {
          throw err;
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
    }
  });

  ws.on("close", data => {
    broadcastToClientsNewConnectedClientList(wss, ws, "DISCONNECT");
  });
});
