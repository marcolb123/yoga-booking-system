// middlewares/authenticate.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fitclass_dev_secret_change_in_prod";

export const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    req.user = null;
    res.locals.user = null;
    res.locals.isOrganiser = false;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    res.locals.user = { userId: payload.userId, name: payload.name, role: payload.role };
    res.locals.isOrganiser = payload.role === "organiser";
    next();
  } catch {
    res.clearCookie("token");
    req.user = null;
    res.locals.user = null;
    res.locals.isOrganiser = false;
    next();
  }
};

export const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/auth/login");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    res.locals.user = { userId: payload.userId, name: payload.name, role: payload.role };
    res.locals.isOrganiser = payload.role === "organiser";
    next();
  } catch {
    res.clearCookie("token");
    res.redirect("/auth/login");
  }
};

export const requireOrganiser = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/auth/login");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "organiser") {
      return res.status(403).render("error", {
        title: "Forbidden",
        message: "You do not have permission to access this page.",
      });
    }
    req.user = payload;
    res.locals.user = { userId: payload.userId, name: payload.name, role: payload.role };
    res.locals.isOrganiser = true;
    next();
  } catch {
    res.clearCookie("token");
    res.redirect("/auth/login");
  }
};
