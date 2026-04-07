// tests/helpers.js
import jwt from "jsonwebtoken";
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export async function resetDb() {
  await initDb();
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

/**
 * Build a signed JWT cookie string for use in supertest requests.
 * @param {{ userId: string, name: string, role: string }} payload
 * @returns {string} serialised cookie header value, e.g. "token=eyJ..."
 */
export function makeJwt(payload) {
  const secret = process.env.JWT_SECRET || "fitclass_dev_secret_change_in_prod";
  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  return `token=${token}`;
}

// Seed a minimal dataset used by multiple tests
export async function seedMinimal() {
  const student = await UserModel.create({
    name: "Test Student",
    email: "student@test.local",
    role: "student",
  });
  const organiser = await UserModel.create({
    name: "Test Organiser",
    email: "organiser@test.local",
    role: "organiser",
  });
  const instructor = await UserModel.create({
    name: "Test Instructor",
    email: "instructor@test.local",
    role: "instructor",
  });

  const course = await CourseModel.create({
    title: "Test Course",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: instructor._id,
    sessionIds: [],
    description: "A test course for E2E route testing.",
  });

  // Two sessions to keep tests fast
  const s1 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-02-02T18:30:00").toISOString(),
    endDateTime: new Date("2026-02-02T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
  });

  const s2 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-02-09T18:30:00").toISOString(),
    endDateTime: new Date("2026-02-09T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
  });

  await CourseModel.update(course._id, { sessionIds: [s1._id, s2._id] });

  return { student, organiser, instructor, course, sessions: [s1, s2] };
}
