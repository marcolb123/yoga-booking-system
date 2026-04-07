// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
          location: c.location || "",
          price: c.price ? `\u00a3${Number(c.price).toFixed(2)}` : "",
        };
      })
    );
    res.render("home", {
      title: "Yoga & Mindfulness Courses",
      courses: cards,
      year: new Date().getFullYear(),
    });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
      isFull: (s.bookedCount ?? 0) >= (s.capacity ?? 0),
    }));

    res.render("course", {
      title: course.title,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
        location: course.location || "",
        price: course.price ? `\u00a3${Number(course.price).toFixed(2)}` : "",
      },
      sessions: rows,
      year: new Date().getFullYear(),
    });
  } catch (err) {
    next(err);
  }
};

export const courseBookPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("course_book", {
      title: `Book: ${course.title}`,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
      },
      sessions: rows,
      sessionsCount: rows.length,
      year: new Date().getFullYear(),
    });
  } catch (err) {
    next(err);
  }
};

export const sessionBookPage = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await SessionModel.findById(sessionId);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });

    const course = await CourseModel.findById(session.courseId);

    res.render("session_book", {
      title: "Book Session",
      session: {
        id: session._id,
        start: fmtDate(session.startDateTime),
        end: fmtDate(session.endDateTime),
        capacity: session.capacity,
        remaining: Math.max(
          0,
          (session.capacity ?? 0) - (session.bookedCount ?? 0)
        ),
      },
      course: course
        ? {
            id: course._id,
            title: course.title,
            location: course.location || "",
          }
        : null,
      year: new Date().getFullYear(),
    });
  } catch (err) {
    next(err);
  }
};

export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.userId || req.user._id;
    const booking = await bookCourseForUser(userId, courseId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res
      .status(400)
      .render("error", { title: "Booking failed", message: err.message });
  }
};

export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.userId || req.user._id;
    const booking = await bookSessionForUser(userId, sessionId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found" });

    const status = req.query.status || booking.status;
    const statusClass = status ? status.toLowerCase() : "";

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      booking: {
        id: booking._id,
        type: booking.type,
        status,
        statusClass,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
      },
      year: new Date().getFullYear(),
    });
  } catch (err) {
    next(err);
  }
};

export const studentDashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookings = await BookingModel.listByUser(userId);
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const course = await CourseModel.findById(b.courseId);
        return {
          id: b._id,
          courseTitle: course?.title || "Unknown Course",
          courseId: b.courseId,
          type: b.type,
          status: b.status,
          statusClass: b.status ? b.status.toLowerCase() : "",
          createdAt: b.createdAt ? fmtDateOnly(b.createdAt) : "",
        };
      })
    );
    res.render("my_bookings", {
      title: "My Bookings",
      bookings: enriched,
    });
  } catch (err) {
    next(err);
  }
};

export const aboutPage = (req, res) => {
  res.render("about", {
    title: "About Us",
    year: new Date().getFullYear(),
  });
};
