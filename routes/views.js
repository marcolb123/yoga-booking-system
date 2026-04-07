// routes/views.js
import { Router } from "express";
import {
  homePage,
  courseDetailPage,
  courseBookPage,
  sessionBookPage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
  studentDashboard,
  aboutPage,
} from "../controllers/viewsController.js";
import { requireAuth } from "../middlewares/authenticate.js";
import { coursesListPage } from "../controllers/coursesListController.js";

const router = Router();

router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/courses/:id/book", courseBookPage);
router.get("/sessions/:id/book", sessionBookPage);
router.post("/courses/:id/book", requireAuth, postBookCourse);
router.post("/sessions/:id/book", requireAuth, postBookSession);
router.get("/bookings/:bookingId", requireAuth, bookingConfirmationPage);
router.get("/my-bookings", requireAuth, studentDashboard);
router.get("/about", aboutPage);

export default router;
