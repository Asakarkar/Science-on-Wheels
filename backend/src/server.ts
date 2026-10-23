import { app } from "./app";
import { env } from "./config/env";
<<<<<<< HEAD

app.listen(env.PORT, () => {
  console.log(
    `Science on Wheels API listening on http://localhost:${env.PORT}`
  );
});
=======
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  console.log(
    `Science on Wheels API listening on port ${env.PORT} (mode: ${env.NODE_ENV})`
  );
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database disconnected. Server closed cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("Error during database disconnection:", err);
      process.exit(1);
    }
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    console.error("Forced termination after shutdown timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
