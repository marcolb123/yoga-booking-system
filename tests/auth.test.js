import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../index.js";
import { resetDb, seedMinimal, makeJwt } from "./helpers.js";
import { UserModel } from "../models/userModel.js";

describe("Authentication routes", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    // Create a user with a real password hash for login tests
    const hash = await bcrypt.hash("Password123", 10);
    await UserModel.create({
      name: "Auth User",
      email: "auth@test.local",
      passwordHash: hash,
      role: "student",
      createdAt: new Date().toISOString(),
    });
  });

  // ── Registration ──────────────────────────────────────────
  test("GET /auth/register renders the registration page", async () => {
    const res = await request(app).get("/auth/register");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Create Account|Register/i);
  });

  test("POST /auth/register with valid data creates user and redirects", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "New Student",
      email: "newstudent@test.local",
      password: "StrongPass1",
      confirmPassword: "StrongPass1",
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    // Cookie should be set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("token="))).toBe(true);
  });

  test("POST /auth/register with short password re-renders with errors", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Short Pass",
      email: "short@test.local",
      password: "123",
      confirmPassword: "123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/at least 8 characters/i);
  });

  test("POST /auth/register with mismatched passwords re-renders with errors", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Mismatch",
      email: "mismatch@test.local",
      password: "Password123",
      confirmPassword: "Different123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/do not match/i);
  });

  test("POST /auth/register with duplicate email re-renders with error", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Duplicate",
      email: "auth@test.local",
      password: "Password123",
      confirmPassword: "Password123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/already registered/i);
  });

  // ── Login ─────────────────────────────────────────────────
  test("GET /auth/login renders the login page", async () => {
    const res = await request(app).get("/auth/login");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Sign In|Login/i);
  });

  test("POST /auth/login with valid credentials redirects and sets cookie", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "auth@test.local",
      password: "Password123",
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("token="))).toBe(true);
  });

  test("POST /auth/login with wrong password re-renders with error", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "auth@test.local",
      password: "WrongPassword",
    });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Invalid email or password/i);
  });

  test("POST /auth/login with non-existent email re-renders with error", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "noone@test.local",
      password: "Whatever123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Invalid email or password/i);
  });

  // ── Logout ────────────────────────────────────────────────
  test("POST /auth/logout clears cookie and redirects", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });
});
