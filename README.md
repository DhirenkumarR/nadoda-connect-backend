# Nadoda Connect — Backend API Server

High-performance RESTful API backend for the **Nadoda Rajput Community Platform (Nadoda Rajput Connect)**. Built with Node.js, Express, MongoDB (Mongoose), and JSON Web Tokens (JWT).

---

## 🌟 Features

- **Authentication & Security**:
  - Secure Mobile Number & Password authentication with bcrypt password hashing.
  - JWT token issuance with active device/session tracking and remote session termination.
  - Role-Based Access Control (RBAC): `super_admin`, `village_admin`, and `member`.
  - Heartbeat endpoint for tracking real-time user presence.
- **Village Hierarchy (વંશાવળી)**:
  - Multi-village multi-tenant architecture (Baspa and other villages).
  - 3-level tree: Village -> Ataks -> Families -> Members.
  - Automatic relationship indexing and family head assignment.
- **Directory & Fast Fuzzy Search**:
  - Search members across Gujarati and English names, contact numbers, ataks, occupations, and work locations.
  - Direct filtering by Atak, Gender, Marital Status, Occupation, and Village.
- **Demographics & Village Statistics**:
  - Auto-calculates total households, total population, gender counts, sex ratio, and average family size.
  - Fast background recalculate endpoint via MongoDB aggregations.
- **Administration & Audit**:
  - Create user accounts from eligible verified directory members.
  - Reset and update user credentials.
  - Active session monitoring across web and mobile apps.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Token (`jsonwebtoken`) & `bcryptjs`
- **Email Service**: Nodemailer (SMTP)
- **CORS**: Enabled for frontend and mobile clients

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nadoda_connect
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development

# Optional Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Seed Initial Database (Optional)
To populate initial villages, ataks, and sample family data:
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000` with hot-reloading enabled.

### 4. Run Production Server
```bash
npm start
```

---

## 📡 API Reference Overview

Base URL: `http://localhost:5000/api` (or `https://nadoda-connect-backend.onrender.com/api` in production)

### Auth (`/api/auth`)
- `POST /api/auth/login` — Login with mobile number and password
- `GET /api/auth/me` — Get current logged-in user and linked member/family data
- `PUT /api/auth/profile` — Update user profile
- `PUT /api/auth/change-password` — Change password
- `POST /api/auth/heartbeat` — Send active heartbeat
- `POST /api/auth/logout` — Terminate current session
- `GET /api/auth/users` — Admin: list all users
- `GET /api/auth/eligible-members` — Admin: search members without login account
- `POST /api/auth/users/create-from-member` — Admin: create login account for a member
- `POST /api/auth/users/:userId/set-password` — Admin: set user password
- `GET /api/auth/active-sessions` — Admin: list active sessions
- `POST /api/auth/users/:sessionId/terminate-session` — Admin: terminate a session

### Villages (`/api/villages`)
- `GET /api/villages` — List all villages
- `GET /api/villages/:id` — Get village details with ataks
- `GET /api/villages/:id/stats` — Get village demographic statistics
- `POST /api/villages/:id/recalculate` — Recalculate village statistics
- `POST /api/villages` — Super Admin: create new village
- `PUT /api/villages/:id` — Update village details

### Families (`/api/families`)
- `GET /api/families?villageId=...&atak=...` — List families with filtering
- `GET /api/families/:id` — Get family details by ID
- `GET /api/families/my-family` — Get logged-in user's family
- `POST /api/families` — Create a new family
- `PUT /api/families/:id` — Update family details
- `DELETE /api/families/:id` — Delete a family

### Members (`/api/members`)
- `GET /api/members?villageId=...&search=...` — Search & filter members
- `GET /api/members/:id` — Get member details
- `POST /api/members` — Add a new member
- `PUT /api/members/:id` — Update member details
- `DELETE /api/members/:id` — Remove a member
