import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, makeJwt } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import { SessionModel } from "../models/sessionModel.js";

describe("Duplicate booking prevention", () => {
  let data, student, studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    student = await UserModel.create({
      name: "Dup Student",
      email: "dup@student.local",
      role: "student",
    });
    studentCookie = makeJwt({
      userId: student._id,
      name: student.name,
      role: "student",
    });
  });

  test("Booking the same course twice returns an error", async () => {
    const first = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", studentCookie)
      .send({ userId: student._id, courseId: data.course._id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", studentCookie)
      .send({ userId: student._id, courseId: data.course._id });
    expect([400, 409]).toContain(second.status);
    expect(second.body.error).toMatch(/already booked/i);
  });

  test("Booking the same session twice returns an error", async () => {
    // Use a different student so course booking above doesn't interfere
    const sessStudent = await UserModel.create({
      name: "Session Dup Student",
      email: "sessdup@student.local",
      role: "student",
    });
    const sessCookie = makeJwt({
      userId: sessStudent._id,
      name: sessStudent.name,
      role: "student",
    });

    const first = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", sessCookie)
      .send({ userId: sessStudent._id, sessionId: data.sessions[0]._id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", sessCookie)
      .send({ userId: sessStudent._id, sessionId: data.sessions[0]._id });
    expect([400, 409]).toContain(second.status);
    expect(second.body.error).toMatch(/already booked/i);
  });
});

describe("Capacity limits", () => {
  let data, studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("Booking a fully-booked session is waitlisted", async () => {
    // Fill up the session to capacity
    const session = data.sessions[0];
    await SessionModel.update(session._id, {
      bookedCount: session.capacity,
    });

    const student = await UserModel.create({
      name: "Capacity Student",
      email: "capacity@student.local",
      role: "student",
    });
    studentCookie = makeJwt({
      userId: student._id,
      name: student.name,
      role: "student",
    });

    const res = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", studentCookie)
      .send({ userId: student._id, sessionId: session._id });
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("WAITLISTED");
  });
});

describe("Role-based access control", () => {
  let data, studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    studentCookie = makeJwt({
      userId: data.student._id,
      name: data.student.name,
      role: "student",
    });
  });

  test("Unauthenticated user cannot access /organiser", async () => {
    const res = await request(app).get("/organiser");
    expect([302, 401, 403]).toContain(res.status);
  });

  test("Student cannot access /organiser dashboard", async () => {
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", studentCookie);
    expect([302, 403]).toContain(res.status);
  });

  test("Organiser can access /organiser dashboard", async () => {
    const organiserCookie = makeJwt({
      userId: data.organiser._id,
      name: data.organiser.name,
      role: "organiser",
    });
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", organiserCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("Student cannot create a course via API", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", studentCookie)
      .send({ title: "Student Course", level: "beginner" });
    expect([302, 401, 403]).toContain(res.status);
  });

  test("Unauthenticated user can still view courses list (SSR)", async () => {
    const res = await request(app).get("/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("Unauthenticated user can view about page", async () => {
    const res = await request(app).get("/about");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});
