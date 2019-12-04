// TODO:
// Separate helper functions into separate file
// Separate interface declarations into seperate file
// Separate DB / Mongoose setup into separate file
import dotenv from "dotenv";
import express from "express";
import moment from "moment";
import mongoose, { Document } from "mongoose";
import morgan from "morgan";
import winston from "winston";
import * as WebSocket from "ws";
import { AvatarProps, ServerAvatarOptions } from "./Avatar";

const logger = winston.createLogger({
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: "server.log" })]
});

dotenv.config();
const MONGODB_CONNECTION_STRING = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}${process.env.MONGO_PATH}`;

mongoose
  .connect(MONGODB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(result => logger.info("MONGO DB SUCCESSFULLY CONNECTED"))
  .catch(err => {
    logger.error("!!! Failed to connect to DB !!!");
    throw err;
  });

const MessageSchema = new mongoose.Schema<IMongooseMessageData>({
  author: String,
  msg: String,
  recipient: String,
  timestamp: String,
  avatarOptions: {}
});

const MessageModel = mongoose.model<IMongooseMessageData>("message", MessageSchema);

// Shape of the data that a client sends in to the server
// See IOutgoingMessageData on the UI
export interface IIncomingMessageData {
  author: string;
  recipient: string;
  msg: string;
  avatarOptions: AvatarProps;
}

export interface IOutgoingNewClientData {
  messages: IMongooseMessageData[];
  users: string[];
  action: "CLIENT_NEW";
}

export interface IOutgoingConnectedClientData {
  users: string[];
  action: "CLIENT_CONNECT" | "CLIENT_DISCONNECT";
}

export interface IOutgoingMessageData {
  author: string;
  recipient: string;
  msg: string;
  timestamp: string;
  avatarOptions: AvatarProps;
  action: "USER_MESSAGE";
}

export interface IMongooseMessageData extends Document {
  author: string;
  recipient: string;
  msg: string;
  timestamp: string;
  avatarOptions: AvatarProps;
}

export interface ICustomWebSocket extends WebSocket {
  url: string;
  avatarOptions: AvatarProps;
  username: string;
}

const app = express();

const port = process.env.PORT || 80;

app.use(morgan("dev"));

// define a route handler for the default home page
app.get("/", (req, res) => {
  logger.info("Currently connected clients: ");
  wss.clients.forEach(client => {
    logger.info(client.url); // ie: /?username=jijnov
  });
  res.send("Hello world! Here are some clients: " + JSON.stringify(wss.clients, null, 2));
});

// start the Express server
const server = app.listen(Number(port), "0.0.0.0", () => {
  logger.info(`server started at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

// TODO: Write suites of unit tests for the below 3 functions to make sure they handle all possible edge cases of inputs
const getUsernameFromSocketURL = (url: string) => url.split("username=")[1].split("&avatarOptions=")[0];
const getAvatarFromSocketURL = (url: string) => {
  const avatarOptionsString = decodeURI(url.split("avatarOptions=")[1]);
  return JSON.parse(avatarOptionsString);
};
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
    avatar: ServerAvatarOptions,
    username: "SERVER"
  });
  (wss.clients as Set<ICustomWebSocket>).forEach(client => {
    if (client.username === ws.username) {
      MessageModel.find({
        $or: [{ author: client.username }, { recipient: client.username }]
      })
        .then(messages => {
          logger.info("Sending messaage to: " + client.username);
          const outgoingNewClientMessage: IOutgoingNewClientData = {
            action: "CLIENT_NEW",
            messages,
            users: usersOfAllClients
          };
          client.send(JSON.stringify(outgoingNewClientMessage));
        })
        .catch(err => {
          throw err;
        });
    } else {
      const outgoingConnectedClientMessage: IOutgoingConnectedClientData = {
        users: usersOfAllClients,
        action: `CLIENT_${updateType}` as "CLIENT_CONNECT" | "CLIENT_DISCONNECT"
      };
      client.send(JSON.stringify(outgoingConnectedClientMessage));
    }
  });
};

const findRecipientSocket = (clients: ICustomWebSocket[], recipient: string): ICustomWebSocket => {
  const recipientSocket = clients.find(client => client.username === recipient);
  return recipientSocket as ICustomWebSocket;
};

wss.on("connection", (ws: ICustomWebSocket, req) => {
  ws.url = String(req.url);
  ws.username = String(getUsernameFromSocketURL(ws.url));
  ws.avatarOptions = getAvatarFromSocketURL(ws.url);
  broadcastToClientsNewConnectedClientList(wss, ws, "CONNECT");
  ws.on("message", data => {
    if (JSON.parse(data.toString()).action === "PING") {
      logger.info("Sending PONG message back to client: " + ws.username);
      ws.send(JSON.stringify({ action: "PONG" }));
      return;
    }
    const serverEcho = () => {
      const outgoingServerMessage: IOutgoingMessageData = {
        author: "SERVER",
        recipient: incomingData.author,
        msg: "Hi I'm the server",
        timestamp: messageArrivalTime,
        avatarOptions: ServerAvatarOptions,
        action: "USER_MESSAGE"
      };
      setTimeout(() => {
        const newMessage = new MessageModel(outgoingServerMessage);
        newMessage
          .save()
          .then(result => logger.info(`Saved DB msg "Hi I'm the server" from SERVER to ${author} `))
          .catch(err => {
            throw err;
          });
        ws.send(JSON.stringify(outgoingServerMessage));
        logger.info(
          `Just sent socket message "Hi I'm the server" from SERVER to ${incomingData.author} (client = ${ws.username})`
        );
      }, 800);
    };

    const messageArrivalTime = moment().format("h:mm:ss:SSS a");

    const incomingData: IIncomingMessageData = JSON.parse(data.toString());
    const { author, recipient, msg, avatarOptions } = incomingData;

    // Take the incoming message, save it to the DB, echo it back to the user that sent it so it shows on their chat
    const outgoingMessage: IOutgoingMessageData = {
      author,
      recipient,
      msg,
      avatarOptions,
      timestamp: messageArrivalTime,
      action: "USER_MESSAGE"
    };
    const newMessage = new MessageModel(outgoingMessage);
    newMessage
      .save()
      .then(result => logger.info(`Saved DB msg ${msg} from ${author} to ${recipient}`))
      .catch(err => {
        throw err;
      });

    ws.send(JSON.stringify(outgoingMessage));
    logger.info(`Sent socket msg ${msg} from ${author} to ${recipient} (client = ${ws.username})`);
    // If the Client selected the server to 'talk' to, handle it a little differently
    if (incomingData.recipient === "SERVER") {
      serverEcho();
    } else {
      // Look up the recipient socket based on
      const recipientSocket: ICustomWebSocket = findRecipientSocket(
        Array.from(wss.clients as Set<ICustomWebSocket>),
        outgoingMessage.recipient
      );
      recipientSocket.send(JSON.stringify(outgoingMessage));
      logger.info(`Sent socket msg ${msg} from ${author} to ${recipient} (client = ${recipientSocket.username})`);
    }
  });

  ws.on("close", data => {
    broadcastToClientsNewConnectedClientList(wss, ws, "DISCONNECT");
  });
});
