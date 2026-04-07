// routes/organiser.js
import { Router } from "express";
import { requireOrganiser } from "../middlewares/authenticate.js";
import {
  getOrgDashboard,
  getOrgCourseList,
  getCreateCourse,
  postCreateCourse,
  getEditCourse,
  postEditCourse,
  postDeleteCourse,
  getCreateSession,
  postCreateSession,
  postDeleteSession,
  getClassList,
  getUsers,
  postDeleteUser,
  getOrganisers,
  postAddOrganiser,
  postDeleteOrganiser,
} from "../controllers/organiserController.js";

const router = Router();
router.use(requireOrganiser);

// Dashboard
router.get("/", getOrgDashboard);

// Courses
router.get("/courses", getOrgCourseList);
router.get("/courses/new", getCreateCourse);
router.post("/courses/new", postCreateCourse);
router.get("/courses/:id/edit", getEditCourse);
router.post("/courses/:id/edit", postEditCourse);
router.post("/courses/:id/delete", postDeleteCourse);

// Sessions
router.get("/courses/:id/sessions/new", getCreateSession);
router.post("/courses/:id/sessions/new", postCreateSession);
router.post("/sessions/:id/delete", postDeleteSession);
router.get("/sessions/:id/class-list", getClassList);

// Users
router.get("/users", getUsers);
router.post("/users/:id/delete", postDeleteUser);

// Organisers
router.get("/organisers", getOrganisers);
router.post("/organisers/add", postAddOrganiser);
router.post("/organisers/:id/delete", postDeleteOrganiser);

export default router;
