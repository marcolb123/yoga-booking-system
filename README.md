# Yoga & Mindfulness Studio – Booking Platform

A server-side rendered (SSR) web application for browsing, booking and managing
yoga & mindfulness classes. Built with **Node.js**, **Express**, **Mustache
templates** and **NeDB** (flat-file document database).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file and edit if needed
cp .env.example .env

# 3. Seed the database with demo data
npm run seed

# 4. Start the server
npm start
# → http://localhost:3000
```

---

## Demo Credentials

| Role       | Email                  | Password        |
|------------|------------------------|-----------------|
| Organiser  | admin@yoga.local       | organiser123    |
| Student    | fiona@student.local    | student123      |
| Student    | james@student.local    | student123      |

---

## Environment Variables

| Variable     | Default                                | Description                    |
|-------------|----------------------------------------|--------------------------------|
| `JWT_SECRET`| `fitclass_dev_secret_change_in_prod`   | Secret for signing JWT tokens  |
| `PORT`      | `3000`                                 | Server listen port             |
| `NODE_ENV`  | `development`                          | `development` / `production` / `test` |

---

## Project Structure

```
├── index.js                 # Express app setup & route mounting
├── controllers/             # Request handlers (auth, views, organiser, bookings, courses)
├── models/                  # NeDB data-access layer (users, courses, sessions, bookings)
├── services/                # Business logic (booking service with duplicate/capacity checks)
├── middlewares/              # Auth middleware (JWT verification, role guards)
├── routes/                  # Express route definitions
├── views/                   # Mustache templates (SSR pages)
│   ├── partials/            # Shared head, header, footer
│   └── organiser/           # Admin-only views
├── public/                  # Static assets (CSS)
├── seed/                    # Database seeder script
├── tests/                   # Jest + Supertest test suites
└── db/                      # NeDB data files (auto-created)
```

---

## Features

### Public (no login required)
- Browse all courses with search, filter (level, type) and pagination
- View course detail pages with session timetables
- View the About page with studio information

### Students (login required)
- Register / login / logout with secure cookie-based JWT auth
- Book an entire course (block booking) or a single drop-in session
- View "My Bookings" dashboard with booking status
- Cancel a booking
- Duplicate booking prevention (cannot book the same course/session twice)

### Organisers (admin panel)
- Dashboard with summary statistics
- Full CRUD for courses and sessions
- View class lists showing enrolled participants
- Manage students, instructors and other organisers
- Delete users (with automatic booking cleanup)

### Security
- Passwords hashed with bcrypt (10 rounds)
- JWT stored in httpOnly, sameSite cookies (secure in production)
- Rate limiting on login endpoint (10 attempts / 15 min)
- Role-based access control on all organiser routes
- Input validation on registration and login forms

---

## API Endpoints

All JSON API routes are prefixed with `/api`:

| Method | Path                              | Auth       | Description              |
|--------|-----------------------------------|------------|--------------------------|
| GET    | `/api/courses`                    | Public     | List all courses (JSON)  |
| POST   | `/api/courses`                    | Organiser  | Create a course          |
| GET    | `/api/courses/:id`                | Public     | Course detail + sessions |
| PUT    | `/api/courses/:id`                | Organiser  | Update a course          |
| DELETE | `/api/courses/:id`                | Organiser  | Delete a course          |
| POST   | `/api/sessions`                   | Organiser  | Create a session         |
| GET    | `/api/sessions/by-course/:id`     | Public     | Sessions for a course    |
| POST   | `/api/bookings/course`            | Student    | Book a full course       |
| POST   | `/api/bookings/session`           | Student    | Book a single session    |
| DELETE | `/api/bookings/:bookingId`        | Student    | Cancel a booking         |

---

## Running Tests

```bash
npm test
```

Runs **Jest** with **Supertest** (41 tests across 7 suites):

- `booking.test.js` – unit tests for capacity logic
- `routes.api.test.js` – JSON API endpoint integration tests
- `routes.ssr.test.js` – server-side rendered page tests
- `routes.health.test.js` – health check & 404 handling
- `routes.errors.test.js` – edge cases (invalid IDs)
- `auth.test.js` – registration, login, logout flows
- `access-control.test.js` – duplicate bookings, capacity limits, role guards

---

## Technology Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express 4
- **Templating:** Mustache (mustache-express)
- **Database:** NeDB-promises (flat-file, no external DB needed)
- **Auth:** bcryptjs + jsonwebtoken (cookie-based)
- **Security:** express-rate-limit
- **Testing:** Jest + Supertest
