const app = require("./app");
const env = require("./config/env");
const { pingDatabase } = require("./config/db");

async function startServer() {
  try {
    await pingDatabase();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();
