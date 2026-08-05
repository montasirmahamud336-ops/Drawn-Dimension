import { app } from "./app.js";
import { env } from "./config/env.js";

const listenHost = env.nodeEnv === "production" ? "127.0.0.1" : undefined;

const onListening = () => {
  console.log(`Admin API running on ${listenHost ?? "all interfaces"} port ${env.port}`);
};

if (listenHost) {
  app.listen(env.port, listenHost, onListening);
} else {
  app.listen(env.port, onListening);
}
