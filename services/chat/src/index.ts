import "reflect-metadata";
import { createConnection, getRepository } from "typeorm";
import * as bodyParser from "body-parser";
import * as session from "express-session";
import { Request, Response } from "express";
import * as redis from "redis";
import { Message } from "./entity/Message";
import * as amqp from "amqplib";

const exphbs = require("express-handlebars");
const RedisStore = require("connect-redis")(session);
const client = redis.createClient({ host: "redis" });

const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

declare global {
  namespace Express {
    interface Session {
      user: any;
    }
  }
}

createConnection()
  .then(async connection => {
    /* RABBIT MQ MESSAGE PUBLISH */
    const rabbitmqConnection = await amqp.connect("amqp://rabbitmq");
    const channel = await rabbitmqConnection.createChannel();
    var queue = "logging";
    var msg = "Chatservice started now";

    channel.assertQueue(queue, {
      durable: false
    });
    channel.sendToQueue(queue, Buffer.from(msg));

    // create express app
    app.engine("handlebars", exphbs());
    app.set("view engine", "handlebars");
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(
      session({
        store: new RedisStore({ client }),
        secret: "keyboard cat",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: true }
      })
    );

    app.get("/test-receiver", (req: Request, res: Response, next: Function) => {
      console.log(
        `${new Date().toISOString()} test: ${req.query.test} - req #${
          req.query.requestNumber
        }`
      );
      res.sendStatus(200);
    });

    app.get("/login", (req: Request, res: Response, next: Function) => {
      if ((req as any).session.user) {
        next();
      }
      return res.redirect("http://localhost:5001/login?service=notebook");
    });

    app.all("/", (req: Request, res: Response, next: Function) => {
      const session = (req as any).session;
      if (session && session.user) {
        return next();
      }
      return res.redirect(
        "http://localhost:5001/login?service=chat&token=safdasdhflsadkfasdf"
      );
    });

    app.get("/", async (req: Request, res: Response, next: Function) => {
      const user = (req as any).session.user;
      console.log(user);
      const notes = await getRepository(Note).find({
        userId: (req as any).session.user.id
      });
      return res.render("home.hbs", {
        ...user,
        notePath: "/note"
        //notes
      });
    });

    app.get("/logout", (req: Request, res: Response, next: Function) => {
      delete (req as any).session;
      return res.redirect("http://localhost:5001/login?service=notebook");
    });

    app.get(
      "/login-success",
      async (req: Request, res: Response, next: Function) => {
        const loggedInUser = JSON.parse(req.query.user);
        (req as any).session.user = loggedInUser;
        return res.render("home.hbs", {
          ...(req as any).session.user
        });
      }
    );

    app.get(
      "/validate-session",
      (req: Request, res: Response, next: Function) => {
        return res.json((req as any).session.user);
      }
    );

    app.use((error: Error, req: Request, res: Response, next: Function) => {
      res.status(500).send(JSON.stringify(error));
    });

    // Do web socket magic here
    io.on("connection", async socket => {
      const name = socket.handshake.query.name;
      const userId = socket.handshake.query.userId;
      console.log(`${userId} of ${name}  connected`);
      io.emit(
        "chat",
        `${new Date().toUTCString()}::${name}: connected to chat`
      );

      socket.on("chat", async function(msg) {
        console.log("message: " + msg);
        
        console.log("here we would save the message aswell ");
        //sends the message to distributed logging service
        channel.sendToQueue(queue, Buffer.from(msg));

        io.emit("chat", `${new Date().toUTCString()}::${name}: ${msg}`);

        const notSavedMessage = new Message();
        notSavedMessage.content = msg;
        notSavedMessage.userId = Number(userId);
        const savedMessage = await getRepository(Message).save(notSavedMessage);

        console.log(savedMessage);
      });

      socket.on("disconnect", function() {
        console.log("user disconnected");
        io.emit("chat", `${name}: disconnected`);
      });
    });

    // start express server
    http.listen(3000);

    console.log("Chat Service Running");
  })
  .catch(error => console.log(error));
