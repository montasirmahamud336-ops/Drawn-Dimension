module.exports = {
  apps: [
    {
      name: "drawndimension-node-api",
      cwd: "./server-node",
      script: "dist/index.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
    {
      name: "drawndimension-chat-api",
      cwd: ".",
      script: "./server/.venv/bin/uvicorn",
      args: "server.main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
  ],
};
