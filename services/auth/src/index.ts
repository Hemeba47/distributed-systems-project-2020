import "reflect-metadata";
import { createConnection, getRepository } from "typeorm";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import { Routes } from "./routes";
import { User } from "./entity/User";
import * as bcrypt from "bcryptjs";

const exphbs = require("express-handlebars");

createConnection()
  .then(async connection => {
    // create express app
    const app = express();
    app.engine("handlebars", exphbs());
    app.set("view engine", "handlebars");
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get("/", (req: Request, res: Response, next: Function) => {
      return res.render("login.hbs");
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

        if (req.body.service === "notebook") {
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
      return res.sendStatus(401);
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
