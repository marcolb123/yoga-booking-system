import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, makeJwt } from "./helpers.js";
import { UserModel } from "../models/userModel.js";

describe("JSON API routes", () => {
  let data;
  let student;
  let studentCookie;
  let organiserCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    // Create a separate student for bookings
    student = await UserModel.create({
      name: "API Student",
      email: "api@student.local",
      role: "student",
    });
    studentCookie = makeJwt({
      userId: student._id,
      name: student.name,
      role: "student",
    });
    organiserCookie = makeJwt({
      userId: data.organiser._id,
      name: data.organiser.name,
      role: "organiser",
    });
  });

  // COURSES
  test("GET /api/courses returns array of courses", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(res.body.courses.some((c) => c.title === "Test Course")).toBe(true);
  });

  test("POST /api/courses creates a course (organiser auth)", async () => {
    const payload = {
      title: "API Created Course",
      level: "advanced",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-01",
      endDate: "2026-05-02",
      instructorId: data.instructor._id,
      description: "Created via API route.",
    };
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", organiserCookie)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.title).toBe("API Created Course");
  });

  test("POST /api/courses returns 403 without organiser auth", async () => {
    const res = await request(app)
      .post("/api/courses")
      .send({ title: "Should Fail" });
    expect([302, 401, 403]).toContain(res.status);
  });

  test("GET /api/courses/:id returns course + sessions", async () => {
    const res = await request(app).get(`/api/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.body.course._id).toBe(data.course._id);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBe(2);
  });

  // SESSIONS
  test("POST /api/sessions creates a session (organiser auth)", async () => {
    const payload = {
      courseId: data.course._id,
      startDateTime: new Date("2026-02-16T18:30:00").toISOString(),
      endDateTime: new Date("2026-02-16T19:45:00").toISOString(),
      capacity: 16,
      bookedCount: 0,
    };
    const res = await request(app)
      .post("/api/sessions")
      .set("Cookie", organiserCookie)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.courseId).toBe(data.course._id);
  });

  test("GET /api/sessions/by-course/:courseId returns sessions array", async () => {
    const res = await request(app).get(
      `/api/sessions/by-course/${data.course._id}`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
  });

  // BOOKINGS
  test("POST /api/bookings/course creates a course booking (student auth)", async () => {
    const res = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", studentCookie)
      .send({
        userId: student._id,
        courseId: data.course._id,
      });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("COURSE");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("POST /api/bookings/session creates a session booking (student auth)", async () => {
    // Use a fresh student so previous course booking doesn't cause duplicate
    const student2 = await UserModel.create({
      name: "Session Student",
      email: "session@student.local",
      role: "student",
    });
    const student2Cookie = makeJwt({
      userId: student2._id,
      name: student2.name,
      role: "student",
    });
    const res = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", student2Cookie)
      .send({
        userId: student2._id,
        sessionId: data.sessions[0]._id,
      });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("SESSION");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("DELETE /api/bookings/:id cancels a booking (student auth)", async () => {
    // Use a fresh student to avoid duplicate booking errors
    const student3 = await UserModel.create({
      name: "Cancel Student",
      email: "cancel@student.local",
      role: "student",
    });
    const student3Cookie = makeJwt({
      userId: student3._id,
      name: student3.name,
      role: "student",
    });
    const create = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", student3Cookie)
      .send({
        userId: student3._id,
        sessionId: data.sessions[1]._id,
      });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking._id;

    const del = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Cookie", student3Cookie);
    expect(del.status).toBe(200);
    expect(del.body.booking.status).toBe("CANCELLED");
  });
});
