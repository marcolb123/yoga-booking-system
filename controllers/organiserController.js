// controllers/organiserController.js
import bcrypt from "bcryptjs";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const fmtDateOnly = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getOrgDashboard = async (req, res, next) => {
  try {
    const [courses, students, bookings] = await Promise.all([
      CourseModel.list(),
      UserModel.listByRole("student"),
      BookingModel.listByUser ? [] : [],
    ]);

    // Count confirmed/waitlisted bookings across all students
    let bookingsCount = 0;
    for (const s of students) {
      const b = await BookingModel.listByUser(s._id);
      bookingsCount += b.filter(
        (x) => x.status === "CONFIRMED" || x.status === "WAITLISTED"
      ).length;
    }

    res.render("organiser/dashboard", {
      title: "Organiser Dashboard",
      stats: {
        coursesCount: courses.length,
        bookingsCount,
        studentsCount: students.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Courses ───────────────────────────────────────────────────────────────────

export const getOrgCourseList = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const rows = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          location: c.location || "",
          price: c.price != null ? `\u00a3${Number(c.price).toFixed(2)}` : "",
          sessionsCount: sessions.length,
          sessions: sessions.map((s) => ({
            id: s._id,
            start: fmtDate(s.startDateTime),
          })),
        };
      })
    );
    res.render("organiser/courses", { title: "Manage Courses", courses: rows });
  } catch (err) {
    next(err);
  }
};

export const getCreateCourse = (req, res) => {
  res.render("organiser/course_form", {
    title: "Add Course",
    action: "/organiser/courses/new",
    course: {},
    isEdit: false,
  });
};

export const postCreateCourse = async (req, res, next) => {
  try {
    const { title, description, level, type, allowDropIn, startDate, endDate, location, price } =
      req.body;
    const errors = [];
    if (!title || !title.trim()) errors.push("Title is required.");
    if (!level) errors.push("Level is required.");
    if (!type) errors.push("Type is required.");
    if (!startDate) errors.push("Start date is required.");
    if (!endDate) errors.push("End date is required.");
    if (price && isNaN(parseFloat(price))) errors.push("Price must be a number.");

    if (errors.length) {
      return res.render("organiser/course_form", {
        title: "Add Course",
        action: "/organiser/courses/new",
        errors,
        course: req.body,
        isEdit: false,
      });
    }

    await CourseModel.create({
      title: title.trim(),
      description: description?.trim() || "",
      level,
      type,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      startDate,
      endDate,
      location: location?.trim() || "",
      price: price ? parseFloat(price) : null,
      sessionIds: [],
      instructorId: null,
    });

    res.redirect("/organiser/courses");
  } catch (err) {
    next(err);
  }
};

export const getEditCourse = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(course._id);

    res.render("organiser/course_form", {
      title: "Edit Course",
      action: `/organiser/courses/${course._id}/edit`,
      course: {
        id: course._id,
        title: course.title,
        description: course.description || "",
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate || "",
        endDate: course.endDate || "",
        location: course.location || "",
        price: course.price != null ? course.price : "",
        isBeginnerSelected: course.level === "beginner",
        isIntermediateSelected: course.level === "intermediate",
        isAdvancedSelected: course.level === "advanced",
        isWeeklyBlockSelected: course.type === "WEEKLY_BLOCK",
        isWeekendWorkshopSelected: course.type === "WEEKEND_WORKSHOP",
      },
      sessions: sessions.map((s) => ({
        id: s._id,
        start: fmtDate(s.startDateTime),
        end: fmtDate(s.endDateTime),
        capacity: s.capacity,
        bookedCount: s.bookedCount ?? 0,
      })),
      isEdit: true,
    });
  } catch (err) {
    next(err);
  }
};

export const postEditCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, level, type, allowDropIn, startDate, endDate, location, price } =
      req.body;
    const errors = [];
    if (!title || !title.trim()) errors.push("Title is required.");
    if (!level) errors.push("Level is required.");
    if (!type) errors.push("Type is required.");
    if (price && isNaN(parseFloat(price))) errors.push("Price must be a number.");

    if (errors.length) {
      const course = await CourseModel.findById(id);
      const sessions = course ? await SessionModel.listByCourse(id) : [];
      return res.render("organiser/course_form", {
        title: "Edit Course",
        action: `/organiser/courses/${id}/edit`,
        errors,
        course: { ...req.body, id },
        sessions: sessions.map((s) => ({
          id: s._id,
          start: fmtDate(s.startDateTime),
          end: fmtDate(s.endDateTime),
          capacity: s.capacity,
          bookedCount: s.bookedCount ?? 0,
        })),
        isEdit: true,
      });
    }

    await CourseModel.update(id, {
      title: title.trim(),
      description: description?.trim() || "",
      level,
      type,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      startDate,
      endDate,
      location: location?.trim() || "",
      price: price ? parseFloat(price) : null,
    });

    res.redirect("/organiser/courses");
  } catch (err) {
    next(err);
  }
};

export const postDeleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessions = await SessionModel.listByCourse(id);
    await Promise.all(sessions.map((s) => SessionModel.delete(s._id)));
    await CourseModel.delete(id);
    res.redirect("/organiser/courses");
  } catch (err) {
    next(err);
  }
};

// ── Sessions ──────────────────────────────────────────────────────────────────

export const getCreateSession = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    res.render("organiser/session_form", {
      title: "Add Session",
      course: { id: course._id, title: course.title },
    });
  } catch (err) {
    next(err);
  }
};

export const postCreateSession = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { startDateTime, endDateTime, capacity } = req.body;
    const errors = [];
    if (!startDateTime) errors.push("Start date/time is required.");
    if (!endDateTime) errors.push("End date/time is required.");
    if (!capacity || isNaN(parseInt(capacity, 10)) || parseInt(capacity, 10) < 1)
      errors.push("Capacity must be a positive number.");
    if (startDateTime && endDateTime && new Date(startDateTime) >= new Date(endDateTime))
      errors.push("End time must be after start time.");

    if (errors.length) {
      const course = await CourseModel.findById(courseId);
      return res.render("organiser/session_form", {
        title: "Add Session",
        course: { id: courseId, title: course?.title || "" },
        errors,
        fields: req.body,
      });
    }

    const session = await SessionModel.create({
      courseId,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      capacity: parseInt(capacity, 10),
      bookedCount: 0,
    });

    const course = await CourseModel.findById(courseId);
    const sessionIds = [...(course.sessionIds || []), session._id];
    await CourseModel.update(courseId, { sessionIds });

    res.redirect(`/organiser/courses/${courseId}/edit`);
  } catch (err) {
    next(err);
  }
};

export const postDeleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await SessionModel.findById(id);
    if (session) {
      const course = await CourseModel.findById(session.courseId);
      if (course) {
        const sessionIds = (course.sessionIds || []).filter((sid) => sid !== id);
        await CourseModel.update(session.courseId, { sessionIds });
      }
      await SessionModel.delete(id);
      res.redirect(`/organiser/courses/${session.courseId}/edit`);
    } else {
      res.redirect("/organiser/courses");
    }
  } catch (err) {
    next(err);
  }
};

// ── Class list ────────────────────────────────────────────────────────────────

export const getClassList = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });

    const course = await CourseModel.findById(session.courseId);
    const bookings = await BookingModel.listBySession(session._id);

    const participants = await Promise.all(
      bookings.map(async (b) => {
        const user = await UserModel.findById(b.userId);
        return {
          name: user?.name || "Unknown",
          email: user?.email || "",
          bookingType: b.type,
          status: b.status,
          statusClass: b.status ? b.status.toLowerCase() : "",
        };
      })
    );

    res.render("organiser/class_list", {
      title: "Class List",
      session: {
        id: session._id,
        start: fmtDate(session.startDateTime),
        end: fmtDate(session.endDateTime),
        capacity: session.capacity,
        bookedCount: session.bookedCount ?? 0,
      },
      course: course
        ? { id: course._id, title: course.title }
        : { id: req.params.id, title: "Unknown Course" },
      participants,
      participantsCount: participants.length,
    });
  } catch (err) {
    next(err);
  }
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = async (req, res, next) => {
  try {
    const students = await UserModel.listByRole("student");
    const rows = students.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt ? fmtDateOnly(u.createdAt) : "",
    }));
    res.render("organiser/users", { title: "Manage Students", users: rows });
  } catch (err) {
    next(err);
  }
};

export const postDeleteUser = async (req, res, next) => {
  try {
    // Also clean up the user's bookings
    await BookingModel.deleteByUser(req.params.id);
    await UserModel.delete(req.params.id);
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
};

// ── Organisers ────────────────────────────────────────────────────────────────

export const getOrganisers = async (req, res, next) => {
  try {
    const organisers = await UserModel.listByRole("organiser");
    const rows = organisers.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      isSelf: u._id === req.user.userId,
      createdAt: u.createdAt ? fmtDateOnly(u.createdAt) : "",
    }));
    res.render("organiser/organisers", {
      title: "Manage Organisers",
      organisers: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const postAddOrganiser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const errors = [];
    if (!name || !name.trim()) errors.push("Name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("A valid email is required.");
    if (!password || password.length < 8)
      errors.push("Password must be at least 8 characters.");

    if (errors.length) {
      const organisers = await UserModel.listByRole("organiser");
      return res.render("organiser/organisers", {
        title: "Manage Organisers",
        organisers: organisers.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          isSelf: u._id === req.user.userId,
        })),
        addErrors: errors,
        addFields: { name, email },
      });
    }

    const existing = await UserModel.findByEmail(email.toLowerCase().trim());
    if (existing) {
      const organisers = await UserModel.listByRole("organiser");
      return res.render("organiser/organisers", {
        title: "Manage Organisers",
        organisers: organisers.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          isSelf: u._id === req.user.userId,
        })),
        addErrors: ["That email address is already registered."],
        addFields: { name, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "organiser",
      createdAt: new Date().toISOString(),
    });

    res.redirect("/organiser/organisers");
  } catch (err) {
    next(err);
  }
};

export const postDeleteOrganiser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) {
      const organisers = await UserModel.listByRole("organiser");
      return res.render("organiser/organisers", {
        title: "Manage Organisers",
        organisers: organisers.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          isSelf: u._id === req.user.userId,
        })),
        error: "You cannot delete your own organiser account.",
      });
    }
    await UserModel.delete(req.params.id);
    res.redirect("/organiser/organisers");
  } catch (err) {
    next(err);
  }
};
