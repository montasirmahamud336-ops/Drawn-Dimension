import { Router } from "express";
import { env } from "../config/env.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Username and password required" });
  }

  if (username !== env.adminUsername) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (password !== env.adminPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({ token: env.adminToken, tokenType: "Bearer" });
});

export default router;
