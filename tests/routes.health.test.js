import request from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";

describe("Health & 404", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
  });

  test("GET /health returns { ok: true }", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/i);
    expect(res.body).toEqual({ ok: true });
  });

  test("GET /no-such-route triggers 404", async () => {
    const res = await request(app).get("/no-such-route");
    expect(res.status).toBe(404);
    // 404 handler renders an HTML error page
    expect(res.headers["content-type"]).toMatch(/html|text/);
    expect(res.text).toMatch(/not found|404/i);
  });
});
