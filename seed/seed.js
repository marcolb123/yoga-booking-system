// seed/seed.js
import bcrypt from "bcryptjs";
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";

const iso = (d) => new Date(d).toISOString();

async function wipeAll() {
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

async function createUsers() {
  const orgHash = await bcrypt.hash("organiser123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  const organiser = await UserModel.create({
    name: "Sarah Mitchell",
    email: "admin@yoga.local",
    passwordHash: orgHash,
    role: "organiser",
    createdAt: new Date().toISOString(),
  });

  const student = await UserModel.create({
    name: "Fiona MacRae",
    email: "fiona@student.local",
    passwordHash: studentHash,
    role: "student",
    createdAt: new Date().toISOString(),
  });

  const student2 = await UserModel.create({
    name: "James Campbell",
    email: "james@student.local",
    passwordHash: studentHash,
    role: "student",
    createdAt: new Date().toISOString(),
  });

  return { organiser, student, student2 };
}

async function createInstructors() {
  const ava = await UserModel.create({
    name: "Ava Chen",
    email: "ava@yoga.local",
    role: "instructor",
    createdAt: new Date().toISOString(),
  });
  const ben = await UserModel.create({
    name: "Ben Kapoor",
    email: "ben@yoga.local",
    role: "instructor",
    createdAt: new Date().toISOString(),
  });
  const claire = await UserModel.create({
    name: "Claire Douglas",
    email: "claire@yoga.local",
    role: "instructor",
    createdAt: new Date().toISOString(),
  });
  const david = await UserModel.create({
    name: "David Park",
    email: "david@yoga.local",
    role: "instructor",
    createdAt: new Date().toISOString(),
  });
  return { ava, ben, claire, david };
}

async function createCourseWithWeeklySessions(courseData, startDate, weekCount, startHour, durationMins) {
  const course = await CourseModel.create(courseData);
  const first = new Date(startDate);
  first.setHours(startHour, 0, 0, 0);
  const sessions = [];

  for (let i = 0; i < weekCount; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: courseData.capacity || 20,
      bookedCount: 0,
    });
    sessions.push(s);
  }

  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return { course, sessions };
}

async function createWorkshopSessions(course, baseDate, sessionCount, durationMins) {
  const base = new Date(baseDate);
  const sessions = [];

  for (let i = 0; i < sessionCount; i++) {
    const start = new Date(base.getTime() + i * (durationMins + 30) * 60 * 1000);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: course.capacity || 25,
      bookedCount: 0,
    });
    sessions.push(s);
  }

  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return sessions;
}

async function run() {
  console.log("Initializing DB…");
  await initDb();

  console.log("Wiping existing data…");
  await wipeAll();

  console.log("Creating users…");
  const { organiser, student, student2 } = await createUsers();

  console.log("Creating instructors…");
  const { ava, ben, claire, david } = await createInstructors();

  // Add this check before seeding:
  const existingUsers = await UserModel.list();
  if (existingUsers.length > 0) {
    console.log('Database already seeded, skipping...');
    process.exit(0);
  }

  // ── Weekly Course 1: Beginner Hatha Yoga (Monday evenings) ──
  console.log("Creating weekly courses…");
  await createCourseWithWeeklySessions(
    {
      title: "Beginner Hatha Yoga",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-06",
      endDate: "2026-06-22",
      instructorId: ava._id,
      sessionIds: [],
      description: "A gentle introduction to yoga focusing on basic postures, breathing techniques, and relaxation. Perfect for those new to yoga.",
      location: "Studio A, 12 High Street",
      price: 96.00,
      capacity: 20,
    },
    "2026-04-06", 12, 18, 75
  );

  // ── Weekly Course 2: Intermediate Vinyasa Flow (Wednesday evenings) ──
  await createCourseWithWeeklySessions(
    {
      title: "Intermediate Vinyasa Flow",
      level: "intermediate",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-08",
      endDate: "2026-06-24",
      instructorId: ben._id,
      sessionIds: [],
      description: "Dynamic flowing sequences linking breath with movement. Builds strength, flexibility, and stamina. Some prior yoga experience recommended.",
      location: "Studio B, 4 Park Lane",
      price: 108.00,
      capacity: 18,
    },
    "2026-04-08", 12, 19, 90
  );

  // ── Weekly Course 3: Mindfulness & Meditation (Tuesday mornings) ──
  await createCourseWithWeeklySessions(
    {
      title: "Mindfulness & Meditation",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-07",
      endDate: "2026-05-26",
      instructorId: claire._id,
      sessionIds: [],
      description: "Learn practical mindfulness and meditation techniques to reduce stress and improve focus. No prior experience needed — just bring an open mind.",
      location: "Studio A, 12 High Street",
      price: 64.00,
      capacity: 15,
    },
    "2026-04-07", 8, 10, 60
  );

  // ── Weekly Course 4: Advanced Ashtanga Practice (Thursday evenings) ──
  await createCourseWithWeeklySessions(
    {
      title: "Advanced Ashtanga Practice",
      level: "advanced",
      type: "WEEKLY_BLOCK",
      allowDropIn: false,
      startDate: "2026-04-09",
      endDate: "2026-06-25",
      instructorId: david._id,
      sessionIds: [],
      description: "A rigorous traditional Ashtanga primary series practice. For experienced yogis who want to deepen their practice with disciplined sequencing.",
      location: "Studio B, 4 Park Lane",
      price: 120.00,
      capacity: 14,
    },
    "2026-04-09", 12, 18, 90
  );

  // ── Weekly Course 5: Gentle Yoga for All (Friday mornings) ──
  await createCourseWithWeeklySessions(
    {
      title: "Gentle Yoga for All",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-10",
      endDate: "2026-06-26",
      instructorId: ava._id,
      sessionIds: [],
      description: "A slow-paced, accessible class suitable for all ages and abilities. Focus on gentle stretching, joint mobility, and deep relaxation.",
      location: "Studio A, 12 High Street",
      price: 84.00,
      capacity: 22,
    },
    "2026-04-10", 12, 10, 60
  );

  // ── Weekend Workshop: Spring Mindfulness Retreat ──
  console.log("Creating weekend workshop…");
  const workshopCourse = await CourseModel.create({
    title: "Spring Mindfulness Retreat Weekend",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-05-09",
    endDate: "2026-05-10",
    instructorId: claire._id,
    sessionIds: [],
    description: "An immersive two-day retreat exploring breathwork, guided meditation, yoga nidra, and mindful movement. Includes refreshments and a take-home meditation guide.",
    location: "Studio A, 12 High Street",
    price: 55.00,
    capacity: 25,
  });

  // Saturday: 3 sessions, Sunday: 2 sessions = 5 total
  const satSessions = await createWorkshopSessions(
    { ...workshopCourse, capacity: 25 },
    "2026-05-09T09:00:00",
    3,
    90
  );
  const sunSessions = await createWorkshopSessions(
    { ...workshopCourse, capacity: 25 },
    "2026-05-10T10:00:00",
    2,
    90
  );

  // Verification
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);
  console.log("\n— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);
  if (courses === 0 || sessions === 0) {
    throw new Error("Seed finished but no courses/sessions were created.");
  }

  console.log("\n✅ Seed complete.\n");
  console.log("— Demo credentials —");
  console.log("Organiser  email   : admin@yoga.local");
  console.log("Organiser  password: organiser123");
  console.log("Student    email   : fiona@student.local");
  console.log("Student    password: student123");
  console.log("Student 2  email   : james@student.local");
  console.log("Student 2  password: student123");
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});
