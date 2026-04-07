// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "fitclass_dev_secret_change_in_prod";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const getRegister = (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("register", { title: "Create Account" });
};

export const postRegister = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push("Name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("A valid email address is required.");
    if (!password || password.length < 8)
      errors.push("Password must be at least 8 characters.");
    if (password !== confirmPassword) errors.push("Passwords do not match.");

    if (errors.length) {
      return res.render("register", {
        title: "Create Account",
        errors,
        fields: { name, email },
      });
    }

    const existing = await UserModel.findByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.render("register", {
        title: "Create Account",
        errors: ["That email address is already registered."],
        fields: { name, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "student",
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign(
      { userId: user._id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, COOKIE_OPTS);
    res.redirect("/");
  } catch (err) {
    next(err);
  }
};

export const getLogin = (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("login", { title: "Sign In" });
};

export const postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const INVALID = "Invalid email or password.";

    if (!email || !password) {
      return res.render("login", { title: "Sign In", error: INVALID, fields: { email } });
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user || !user.passwordHash) {
      return res.render("login", { title: "Sign In", error: INVALID, fields: { email } });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.render("login", { title: "Sign In", error: INVALID, fields: { email } });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, COOKIE_OPTS);

    if (user.role === "organiser") return res.redirect("/organiser");
    res.redirect("/");
  } catch (err) {
    next(err);
  }
};

export const postLogout = (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
};
