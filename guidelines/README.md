# ProManager — System Guidelines

## Overview
ProManager is a full-stack project management & team collaboration platform built with NestJS + React + PostgreSQL.

---

## What's Done

### Core Modules
| Module | Quality | Notes |
|--------|---------|-------|
| Auth + JWT | ✅ Strong | Auto-generated passwords, must-change flag, invitation flow, role-based guards |
| Kanban Board | ✅ Strong | DnD, 5-column pipeline, subtask cards, quick actions, help requests |
| Task System | ✅ Strong | Multi-assignee, priorities, phases, due dates, contribution tracking |
| Permissions | ✅ Strong | 4-level + inheritance + role-to-permission mapping + system admin |
| Invitations | ✅ Strong | Email invite, 7-day token, resend/cancel, accepted-by, invited-by tracking |
| Stats + Heatmaps | ✅ Good | GitHub-style contribution graph per user, team, system-wide |
| Real-time Chat | ✅ Good | WebSocket, online presence, delivery ticks, file/image, room sidebar |
| Email Notifications | ✅ Solid | Task assigned/completed/review, comment, phase targeting, email logs |
| Email Templates | ✅ Professional | SVG icons, gradient headers, structured task cards, clean layout |
| Feedback System | ✅ Full page | Project-scoped, reply threads, pagination, screenshot paste |
| Admin Dashboard | ✅ Good | Cross-system stats, user management (edit/hard-delete), project toggling |
| Communications Panel | ✅ Good | Email log viewer, invitation tracker, resend |
| Help Requests | ✅ Good | Task card → chat flow with help_request message type |
| User Management | ✅ Strong | Create with auto-password + role selector, edit, hard-delete, deactivate |
| **Org Structure** | ✅ Done | Divisions, Departments, Job Positions, Employee Profiles + Org Chart API + Frontend panel |
| **Attendance System** | ✅ Done | HMAC QR tokens (90s expiry), one-time-use, geofence, clock in/out, today dashboard + records |
| **Sidebar Navigation** | ✅ Done | Collapsible sidebar with Projects, Org, People, Attendance, Leave, Reports, Comms |
| **Error Handling** | ✅ Done | Custom exception classes: EntityNotFound, DuplicateEntry, InvalidToken, Geofence, etc. |
| Issue Tracker | ⚠️ Basic | Create/update only |

### Architecture
- **21 entities** across PostgreSQL (Neon)
- **NestJS 11** with TypeORM 0.3 + Socket.io + Helmet
- **React 18 + Vite 5 + Tailwind CSS**
- **Shared enums**: centralized constants
- **SOLID**: services with single responsibility, dependency injection
- **ACID**: TypeORM transactions on writes, FK cascades, PostgreSQL durability
- **Frontend API**: full coverage of all backend endpoints

---

## Pending

### Phase 3 — IVR Phone Attendance
- [ ] Twilio/Africa's Talking integration
- [ ] Call logs as AttendanceRecord with method='call'

### Phase 4 — Leave Management
- [ ] LeaveType, LeaveRequest, LeaveBalance entities + approval workflow

### Phase 5 — Reports & Exports
- [ ] PDF/CSV for attendance, leave, headcount, payroll

### Phase 6 — Recruitment
- [ ] JobPosting, Application entities + CV upload

### Technical Debt
- [ ] TypeORM migrations
- [ ] Rate limiting on auth
- [ ] Input sanitization (XSS)
- [ ] Test suite

---

## Deployment
| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Render | https://project-manager-api.onrender.com |
| Frontend | Vercel | https://project-management-nine-roan.vercel.app |
| Database | Neon PostgreSQL | (private) |

## Dev Commands
```bash
npm run dev          # Start backend + frontend
npm run build        # Production build
npm run typecheck    # Type-check both
```
