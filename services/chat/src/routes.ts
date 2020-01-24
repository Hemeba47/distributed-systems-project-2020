import { UserController } from "./controller/NoteController";

export const Routes = [
  {
    method: "get",
    route: "/note",
    controller: UserController,
    action: "all"
  },
  {
    method: "get",
    route: "/note/:id",
    controller: UserController,
    action: "one"
  },
  {
    method: "post",
    route: "/note",
    controller: UserController,
    action: "save"
  },
  {
    method: "delete",
    route: "/note/:id",
    controller: UserController,
    action: "remove"
  }
];
