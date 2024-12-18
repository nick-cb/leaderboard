import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/game-layout.tsx", [route("game/:gameId", "routes/game.tsx")]),
] satisfies RouteConfig;
