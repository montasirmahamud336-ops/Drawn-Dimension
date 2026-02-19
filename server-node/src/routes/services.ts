import { Router } from "express";
import { query } from "../db";

const router = Router();

router.get("/services", async (_req, res) => {
  const result = await query<{ id: number; name: string }>(
    `SELECT id, name FROM services ORDER BY name ASC`
  );
  return res.json(result.rows);
});

export default router;
