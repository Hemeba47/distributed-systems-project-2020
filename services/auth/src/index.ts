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
        /**
         * Log user in if the password hashes match
         */
        const pwOk = bcrypt.compareSync(req.body.password, user.password);

        if (!pwOk) {
          /**
           * If not just return 401
           */
          return res.sendStatus(401);
        }

        /**
         * Encode user to the URI for passing the
         * user info for the service that the client
         * is being redirected to
         */
        const uriEncodedUser = encodeURIComponent(JSON.stringify(user));

        if (req.body.service === "chat") {
          return res.redirect(
            `http://localhost:5000/login-success?user=${uriEncodedUser}`
          );
        }
        if (req.body.service === "profile") {
          return res.redirect(
            `http://localhost:5001/profile?user=${uriEncodedUser}`
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
        try {
          const user = new User({
            ...req.body,
            password: bcrypt.hashSync(req.body.password, 8)
          });
          const { password, ...savedUser } = await getRepository(User).save(
            user
          );
          console.log(savedUser);
          const redirectUrl = `/profile?user=${encodeURIComponent(
            JSON.stringify(savedUser)
          )}`;
          console.log(redirectUrl);
          return res.redirect(redirectUrl);
        } catch (err) {
          console.log(err);
          return res.sendStatus(400);
        }
      }
    );

    /**
     * Render the logged in users information
     */
    app.get("/profile", (req: Request, res: Response, next: Function) => {
      const loggedInUser = JSON.parse(req.query.user);
      //(req as any).session.user = loggedInUser;
      return res.render("profile.hbs", {
        userURIComponent: encodeURIComponent(JSON.stringify(loggedInUser)),
        ...loggedInUser
      });
    });

    /**
     * Run a test to see how long it takes to
     * send N amount of requests between nodes
     */
    app.post("/run-tests", async (req, res) => {
      // if requestCount provided with the initiating
      // request use that, if not use 30 as default
      const reqCount = Number(req.query.requestCount) || 30;
      // create range [0...reqCount]
      const range = [...Array(reqCount).keys()];
      // if testName provided with the initiating
      // request use that, if not use "default-test" as default
      const testName = req.query.testName || "default-test";
      // keep track how long it took to send all N requests
      const t0 = new Date();
      const d = await Promise.all(
        range.map(i => {
          return axios.get(
            `http://chat:3000/test-receiver?test=${testName}&requestNumber=${i}`
          );
        })
      );
      // time after the requests were sent
      const t1 = new Date();
      // return info about the test to the client
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
