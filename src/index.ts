import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import winston from "winston";
import * as WebSocket from "ws";

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
const server = app.listen(port, () => {
  logger.info(`server started at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (message: string) => {
    logger.info("received", message);
    ws.send("Hello, you sent -> " + message);
  });
  ws.send("Hi there, I am a WebSocket server");
});
