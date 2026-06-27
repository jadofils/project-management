# ProManager — System Guidelines

## Overview
ProManager is a full-stack project management & team collaboration platform built with NestJS + React + PostgreSQL.

---

## What's Done (Current State)

### Core Modules
| Module | Quality | Notes |
|--------|---------|-------|
| Auth + JWT | ✅ Strong | Auto-generated passwords, must-change flag, invitation flow, role-based guards |
| Kanban Board | ✅ Strong | Drag-and-drop, 5-column pipeline, subtask cards, quick actions per column |
| Task System | ✅ Strong | Multi-assignee, priorities, phases, due dates, contribution tracking |
| Permission Model | ✅ Strong | 4-level per-project (viewer/contributor/editor/manager) + inheritance + admin |
| Invitation System | ✅ Strong | Email invite, 7-day token, pending/resend/cancel, accepted-by, invited-by tracking |
| Stats + Heatmaps | ✅ Good | GitHub-style contribution graph per user, team, system-wide |
| Real-time Chat | ✅ Good | WebSocket (Socket.io), online presence, delivery ticks, file/image, room sidebar |
| Email Notifications | ✅ Solid | Task assigned/completed/review, comment, phase targeting, email logs |
| Feedback System | ✅ Full page | Project-scoped, reply threads, pagination, screenshot paste |
| Admin Dashboard | ✅ Good | Cross-system stats, user management (edit/hard-delete), project toggling |
| Communications Panel | ✅ Good | Email log viewer, invitation tracker, resend capability |
| Help Requests | ✅ Good | Task card → chat flow with help_request message type |
| **Org Structure** | ✅ Phase 1 done | Divisions, Departments, Job Positions, Employee Profiles + Org Chart API |
| **Sidebar Navigation** | ✅ Done | Collapsible sidebar with 7 groups (Projects, Org, People, Attendance, Leave, Reports, Comms) |
| User Management | ✅ Strong | Create with auto-password + role selector, edit, hard-delete, deactivate/activate |
| Issue Tracker | ⚠️ Basic | Create/update only — no assignment workflow |

### Backend Architecture
- **17 entities**: User, Project, Task, Comment, Issue, Feedback, FeedbackReply, ProjectMember, ProjectMessage, ProjectInvitation, Subtask, TaskAssignmentLog, EmailLog, Division, Department, JobPosition, EmployeeProfile
- **Shared enums** (`shared/enums.ts`): centralized constants for all statuses, roles, permissions
- **ChatGateway**: Socket.io with JWT auth, project rooms, presence tracking
- **Encryption middleware**: AES payload encryption with lazy key loading
- **Helmet**: Security headers enabled
- **Email logging**: All sent emails tracked in `email_logs`
- **Stats service**: Aggregated task metrics with assignment history
- **Org API**: `/api/org` — divisions, departments, positions, employees, org chart

### Frontend Architecture
- React 18 + Vite 5 + Tailwind CSS
- Extracted components: TaskCard, NewTaskModal, FeedbackPanel, DeleteConfirmModal, Sidebar
- React.memo on TaskCard, ChatRoomsPage, FeedbackPage
- Multi-room chat: ChatRoomsPage with sidebar, cached messages, instant switching
- Permission inheritance: hierarchical with role-to-level mapping
- Feedback page: full list + expandable reply threads + create modal
- Collapsible sidebar: 7 groups with nested sub-navigation

---

## What's Pending

### Phase 2 — Attendance System (NEXT)
- [ ] Office entity (location, GPS coords, name)
- [ ] AttendanceToken entity (HMAC, short-lived, one-time-use)
- [ ] AttendanceRecord entity (clock_in, clock_out, method, verified)
- [ ] QR generation endpoint (employee-facing)
- [ ] QR scan/verify endpoint (admin/scanner-facing)
- [ ] Geofence validation
- [ ] Daily dashboard (who's in/out right now)

### Phase 3 — IVR Phone Attendance
- [ ] Twilio/Africa's Talking IVR integration
- [ ] Call logs stored as AttendanceRecord with method='call'

### Phase 4 — Leave Management
- [ ] LeaveType, LeaveRequest, LeaveBalance entities
- [ ] Approval workflow with email notifications

### Phase 5 — Reports & Exports
- [ ] PDF/CSV exports for attendance, leave, headcount, payroll

### Phase 6 — Recruitment
- [ ] JobPosting, Application entities with CV upload

### Technical Debt
- [ ] TypeORM migrations
- [ ] Rate limiting on auth
- [ ] XSS prevention
- [ ] Test suite (0%)

---

## Deployment
| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Render | https://project-manager-api.onrender.com |
| Frontend | Vercel | https://project-management-nine-roan.vercel.app |
| Database | Neon PostgreSQL | (private) |

### Env Vars
```
NODE_ENV, PORT, DATABASE_URL, DB_SYNCHRONIZE, DB_SSL_REJECT_UNAUTHORIZED,
JWT_SECRET, JWT_EXPIRATION, INTER_SYSTEM_ENCRYPTION_KEY,
ADMIN_EMAIL, ADMIN_PASS, MAIL_USER, MAIL_PASS, FRONTEND_URL,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

## Dev Commands
```bash
npm run dev          # Start backend + frontend
npm run build        # Production build
npm run typecheck    # Type-check both
```
