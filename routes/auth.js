// routes/auth.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  postLogout,
} from "../controllers/authController.js";

const router = Router();

// Rate limit login attempts — 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/register", getRegister);
router.post("/register", postRegister);
router.get("/login", getLogin);
router.post("/login", loginLimiter, postLogin);
router.post("/logout", postLogout);

export default router;
