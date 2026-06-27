# ProManager — System Guidelines

## Overview
ProManager is a full-stack project management & team collaboration platform built with NestJS + React + PostgreSQL. Initially designed for Bwenge Learners development teams, now evolving into a comprehensive company management suite.

---

## What's Done (Current State)

### Core Modules
| Module | Quality | Notes |
|--------|---------|-------|
| Auth + JWT | ✅ Strong | Auto-generated passwords, must-change flag, invitation flow, role-based guards |
| Kanban Board | ✅ Strong | Drag-and-drop, 5-column pipeline (Todo/InProgress/Review/Rework/Done) |
| Task System | ✅ Strong | Multi-assignee, priorities, phases, due dates, subtasks, contribution tracking |
| Permission Model | ✅ Strong | 4-level per-project + inheritance + system admin |
| Invitation System | ✅ Strong | Email invite, 7-day token link, pending/resend/cancel, accepted-by tracking |
| Stats + Heatmaps | ✅ Good | GitHub-style contribution graph per user, team, system-wide |
| Real-time Chat | ✅ Good | WebSocket (Socket.io), online presence, delivery ticks, file/image sharing, room sidebar |
| Email Notifications | ✅ Solid | Task assigned/completed/review, comment added, phase-based targeting, email logs |
| Feedback System | ✅ Full page | Project-scoped, reply threads, pagination, screenshot paste |
| Admin Dashboard | ✅ Good | Cross-system stats, user management (edit/hard-delete), project toggling |
| Communications Panel | ✅ Good | Email log viewer, invitation tracker, resend capability |
| Help Requests | ✅ Good | Task card → chat flow with help_request message type |
| Issue Tracker | ⚠️ Basic | Create/update only, no assignment workflow |

### Backend Architecture
- **NestJS 11** with TypeORM 0.3 + PostgreSQL
- **Shared enums** (`shared/enums.ts`): TaskStatus, ProjectRole, PermissionLevel, etc.
- **ChatGateway**: Socket.io with JWT auth, project rooms, presence tracking
- **Encryption middleware**: AES payload encryption for inter-system comms
- **Helmet**: Security headers enabled
- **Email logging**: All sent emails tracked in `email_logs` table
- **Stats service**: Aggregated task metrics with assignment history

### Frontend Architecture
- **React 18 + Vite 5 + Tailwind CSS**
- **Extracted components**: TaskCard, NewTaskModal, FeedbackPanel, DeleteConfirmModal
- **React.memo** on heavy components (TaskCard, ChatRoomsPage, FeedbackPage)
- **Multi-room chat**: ChatRoomsPage with sidebar, cached messages, instant switching
- **Permission inheritance**: Hierarchical permissions with role-to-level mapping
- **Feedback page**: Full list + expandable reply threads + create modal

---

## What's Pending

### Phase 1 — Organization Structure
- [ ] Division entity (id, name, code, head_user_id, description)
- [ ] Department entity (id, division_id, name, head_user_id)
- [ ] Employee profile entity (user_id FK, department_id, job_position_id, phone, national_id, date_of_birth, hire_date, contract_type, employment_status, salary_band)
- [ ] JobPosition entity (id, title, division_id, grade, min_salary, max_salary)
- [ ] Admin UI: org chart view, employee directory
- [ ] Sidebar navigation restructuring

### Phase 2 — Attendance System
- [ ] QR attendance: rotating HMAC token, scan endpoint, one-time-use guard
- [ ] Attendance records + daily dashboard (who's in/out now)
- [ ] Geofence validation on scan
- [ ] AttendanceToken entity (short-lived, Redis or DB)
- [ ] AttendanceRecord entity

### Phase 3 — IVR Phone Attendance
- [ ] Twilio/Africa's Talking IVR integration
- [ ] Call logs stored as AttendanceRecord with method='call'
- [ ] PIN verification option

### Phase 4 — Leave Management
- [ ] LeaveType entity
- [ ] LeaveRequest entity with approval workflow
- [ ] LeaveBalance tracking per year
- [ ] Manager leave calendar
- [ ] Email notifications to department heads

### Phase 5 — Reports & Exports
- [ ] Monthly attendance PDF/CSV per employee
- [ ] Leave balance summary PDF
- [ ] Division headcount CSV
- [ ] Task completion per employee PDF (links to contribution graph)
- [ ] Payroll preview CSV

### Phase 6 — Recruitment
- [ ] JobPosting entity
- [ ] Application entity with status workflow
- [ ] CV upload
- [ ] Interview scheduling

### Technical Debt
- [ ] TypeORM migrations instead of synchronize
- [ ] Rate limiting on auth endpoints
- [ ] Input sanitization (XSS prevention)
- [ ] PDF/CSV export library integration
- [ ] Email templates abstraction
- [ ] Test suite (0% coverage currently)

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Render | https://project-manager-api.onrender.com |
| Frontend | Vercel | https://project-management-nine-roan.vercel.app |
| Database | Neon PostgreSQL | (private) |

### Required Environment Variables
```
NODE_ENV, PORT, DATABASE_URL, DB_SYNCHRONIZE, DB_SSL_REJECT_UNAUTHORIZED,
JWT_SECRET, JWT_EXPIRATION, INTER_SYSTEM_ENCRYPTION_KEY,
ADMIN_EMAIL, ADMIN_PASS, MAIL_USER, MAIL_PASS, FRONTEND_URL,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

---

## Development Commands
```bash
# Root
npm run dev          # Start backend + frontend concurrently
npm run build        # Build backend for production
npm run lint         # Lint both projects
npm run typecheck    # Type-check both projects

# Backend
cd backend
npm run dev          # Start NestJS in watch mode
npm run build        # Production build (nest build)
npm start            # Start production server

# Frontend
cd frontend
npm run dev          # Vite dev server (port 4000)
npm run build        # Production build (tsc + vite build)
```

## Database
- **Synchronize**: Set `DB_SYNCHRONIZE=true` to auto-create tables (default on first deploy)
- **Migrations**: Pending — recommended for production
- **Entities**: 13 entities (User, Project, Task, Comment, Issue, Feedback, FeedbackReply, ProjectMember, ProjectMessage, ProjectInvitation, Subtask, TaskAssignmentLog, EmailLog)
