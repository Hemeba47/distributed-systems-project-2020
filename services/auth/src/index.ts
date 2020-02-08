import "reflect-metadata";
import { createConnection, getRepository } from "typeorm";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import { Routes } from "./routes";
import { User } from "./entity/User";
import * as bcrypt from "bcryptjs";
import * as amqp from "amqplib";
import axios from "axios";

const exphbs = require("express-handlebars");

/*
process.on("exit", () => console.log("Now we exiting"));
setInterval(() => console.log("piip"), 5000);

setTimeout(() => {
  process.exit(22);
}, 15000);
*/

createConnection()
  .then(async connection => {
    /* RABBIT MQ MESSAGE PUBLISH */
    const rabbitmqConnection = await amqp.connect("amqp://rabbitmq");

    const channel = await rabbitmqConnection.createChannel();
    var queue = "logging";
    var msg = "logginservice started now";

    channel.assertQueue(queue, {
      durable: false
    });

    channel.sendToQueue(queue, Buffer.from(msg));

    // create express app
    const app = express();
    app.engine("handlebars", exphbs());
    app.set("view engine", "handlebars");
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get("/", (req: Request, response: Response, next: Function) => {
      return response.render("login.hbs");
    });

    app.get("/login", (req: Request, res: Response, next: Function) => {
      return res.render("login.hbs");
    });

    app.post("/login", async (req: Request, res: Response, next: Function) => {
      const user = await getRepository(User).findOne({
        email: req.body.email
      });

      if (user) {
        const pwOk = bcrypt.compareSync(req.body.password, user.password);

        console.log(pwOk);

        if (!pwOk) {
          return res.sendStatus(401);
        }

        if (req.body.service === "chat") {
          return res.redirect(
            `http://localhost:5000/login-success?user=${encodeURIComponent(
              JSON.stringify(user)
            )}`
          );
        }
        if (req.body.service === "profile") {
          return res.redirect(
            `http://localhost:5000/login-success?user=${encodeURIComponent(
              JSON.stringify(user)
            )}`
          );
        }
      }

      return res.json(user);
    });

    app.get("/register", (req: Request, res: Response, next: Function) => {
      return res.render("register.hbs");
    });

    app.post(
      "/register",
      async (req: Request, res: Response, next: Function) => {
        console.log(req.body);
        try {
          const user = new User({
            ...req.body,
            password: bcrypt.hashSync(req.body.password, 8)
          });
          const savedUser = await getRepository(User).save(user);
          return res.json(savedUser);
        } catch (err) {
          console.log(err);
          return res.sendStatus(400);
        }
      }
    );

    app.get("/profile", (req: Request, res: Response, next: Function) => {
      const loggedInUser = JSON.parse(req.query.user);
      (req as any).session.user = loggedInUser;
      return res.render("profile.hbs", {
        ...(req as any).session.user
      });
    });

    app.post("/run-tests", async (req, res) => {
      const reqCount = Number(req.query.requestCount) || 30;
      const range = [...Array(reqCount).keys()];
      const testName = req.query.testName || "default-test";
      const t0 = new Date();
      const d = await Promise.all(
        range.map(i => {
          return axios.get(
            `http://chat:3000/test-receiver?test=${testName}&requestNumber=${i}`
          );
        })
      );
      const t1 = new Date();
      return res.json({
        msg: `ran ${reqCount} requests in time t0 - t1`,
        t0,
        t1
      });
    });

    // register express routes from defined application routes
    Routes.forEach(route => {
      (app as any)[route.method](
        route.route,
        (req: Request, res: Response, next: Function) => {
          const result = new (route.controller as any)()[route.action](
            req,
            res,
            next
          );
          if (result instanceof Promise) {
            result.then(result =>
              result !== null && result !== undefined
                ? res.send(result)
                : undefined
            );
          } else if (result !== null && result !== undefined) {
            res.json(result);
          }
        }
      );
    });

    app.listen(3000);

    console.log("Auth Server Running...");
  })

  .catch(error => {
    console.log(error.message);
    console.log(error);
  });
