# Project Manager — Guidelines & Architecture

## Overview

Full-stack project management + AI content creation platform.

- **Backend**: NestJS 11 + TypeORM + Neon PostgreSQL (deployed on Render)
- **Frontend**: React 18 + Vite + Tailwind CSS + TypeScript (deployed on Vercel)
- **AI**: OpenAI (default) or Anthropic Claude via `LLM_PROVIDER` env var
- **Admin email**: jasezikeye50@gmail.com

---

## Environment Variables

### Backend (Render)
```
DATABASE_URL=           # Neon PostgreSQL connection string
JWT_SECRET=             # JWT signing secret
AI_API_KEY=             # OpenAI API key (or OPENAI_API_KEY)
ANTHROPIC_API_KEY=      # Anthropic API key (if using claude provider)
LLM_PROVIDER=           # 'openai' (default) | 'claude' | 'anthropic'
LLM_MODEL=              # e.g. 'gpt-4o-mini' or 'claude-sonnet-4-6'
AI_API_URL=             # Optional: custom OpenAI-compatible API URL
FRONTEND_URL=           # Vercel frontend URL (for CORS)
SMTP_HOST=              # Email (Brevo SMTP or similar)
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### Frontend (Vercel)
```
VITE_API_URL=   # Backend Render URL (e.g. https://your-app.onrender.com)
```

---

## Database Entities (24 tables)

### Core
- `users` — accounts, system_role (admin/user), must_change_password
- `projects` — owner_id, status, type (individual/company)
- `project_members` — role, permission_level (viewer/editor/admin)
- `tasks` — status, priority, phase, assignee_ids[], image_urls[], subtask_count
- `subtasks` — task children, sort_order
- `comments` — task comments
- `task_assignment_logs` — audit trail of assign/unassign events

### Collaboration
- `project_invitations` — token-based email invites
- `project_messages` — in-project chat
- `feedbacks` — user bug reports / feature requests
- `feedback_replies` — admin/user threaded replies
- `issues` — project bug tracking

### HR / Org
- `divisions`, `departments`, `job_positions`, `employee_profiles`
- `attendance_records`, `attendance_tokens`, `offices` — QR-based clock-in/out
- `leave_types`, `leave_requests`, `leave_balances`
- `job_postings`, `applications` — recruitment pipeline

### Content Studio
- `content_categories` — slug, icon, color, description
- `content_templates` — category-linked templates
- `content_drafts` — main content entity (see below)
- `content_passwords` — bcrypt gate for studio access
- `email_logs` — outbound email audit trail

### Governance
- `proposals` — feature requests with votes and comments
- `proposal_votes`, `proposal_comments`
- `error_logs` — server-side error tracking

---

## Content Draft Entity Fields

```typescript
id, user_id, category_id, title, body
language (default: 'en')
background (nullable) — visual theme slug
status: 'draft' | 'published' | 'scheduled'
content_type: 'post' | 'reel' | 'audio' | 'dialog'
hashtags: string[] (JSON)
best_platform: string
engagement_score: number (1-10, AI predicted)
persona: string (Universal/Gen Z/Millennials/Professionals/Students/Parents)
scheduled_at: Date (nullable)
project_id: UUID (nullable, set on publish)
use_count: number (default 0) — incremented by PATCH /content/drafts/:id/use
last_used_at: Date (nullable)
usage_log: { platform?, note?, used_at }[] (JSON) — full usage history
created_at: Date
```

---

## Content Studio Features (DONE)

- [x] Password-gated access (bcrypt hash stored in DB)
- [x] AI batch generation (1–100 posts) — `POST /content/ai/batch`
- [x] Content types: post, reel, audio, dialog (Tinyuwizev1.1 vs Fatikaramuv1.0)
- [x] Personas: Universal, Gen Z, Millennials, Professionals, Students, Parents
- [x] Custom topic focus
- [x] Save selected / discard / bulk save
- [x] Draft library with search, filter by category, pagination
- [x] Edit, delete, copy, preview, publish drafts
- [x] Platform formatter (Instagram/TikTok/Twitter/LinkedIn/Facebook)
- [x] A/B title variant generator
- [x] Viral pattern analyzer
- [x] Content library AI insights (top categories, gaps, suggestions)
- [x] Card export: image download, carousel, multi-format
- [x] Section splitter — breaks post into slide sections
- [x] 3D Card Viewer with 25 templates in 5 categories:
  - Classic: float, prismatic, parallax, hologram, vortex
  - Space: solar, galaxy, nebula, nightsky, moon
  - Sky: sun, clouds, sunset, snow, thunder
  - Nature: ocean, volcano, earth, forest, rain
  - Creative: matrix, fireworks, neon, plasma, glitch
- [x] Wave overlays (fan, circular/orbit, cross) with color/speed control
- [x] AI template recommendation — generates `template3d` field per post
- [x] Dialog card contrast fix (hexLuminance for bubble readability)
- [x] No emoji in frontend/AI output — infographic text markers instead
- [x] Mark as Used tracking (use_count, last_used_at, usage_log)
- [x] AI Improve recommendations (hook, structure, hashtags, CTA, platform)
- [x] Analytics: usage stats, platform distribution, most-used, recently used

---

## Content Studio Missing / Future

- [ ] Social media API integration (real engagement metrics from Instagram/TikTok/etc.)
- [ ] Scheduled post auto-publishing (currently just stores `scheduled_at`)
- [ ] Content calendar view (calendar UI for scheduled posts)
- [ ] Per-platform analytics (which platform actually drove engagement)
- [ ] A/B test result logging (track which title variant performed better)
- [ ] Draft collaboration (multiple users editing same draft)
- [ ] Content approval workflow (draft → review → published)
- [ ] Hashtag performance database (track which hashtags drive reach)

---

## API Endpoints

### Auth
```
POST /auth/login
POST /auth/register
POST /auth/change-password
```

### Content
```
GET/POST       /content/categories
PATCH/DELETE   /content/categories/:id
GET/POST       /content/templates
GET            /content/drafts
POST           /content/drafts
POST           /content/drafts/bulk
PATCH          /content/drafts/:id
DELETE         /content/drafts/:id
PATCH          /content/drafts/:id/use       ← mark used, increment use_count
POST           /content/drafts/:id/publish
POST           /content/verify-password
POST           /content/set-password
POST           /content/ai/batch
POST           /content/ai/format
POST           /content/ai/variants
POST           /content/ai/analyze-pattern
GET            /content/ai/analyze
POST           /content/ai/improve           ← AI improvement recommendations
```

---

## TypeORM Migration Note

This project uses `synchronize: true` in production (Neon PostgreSQL).
New entity columns are auto-added. Adding nullable or default columns is safe.
**Never rename or drop existing columns** without a proper migration.

New columns added to `content_drafts`:
- `use_count` INT DEFAULT 0
- `last_used_at` TIMESTAMP NULL
- `usage_log` TEXT (JSON array) NULL

---

## 3D Card Viewer Architecture

File: `frontend/src/components/ThreeDCardViewer.tsx`

- Uses React Three Fiber (R3F) v8 + `@react-three/drei`
- All particle/ribbon systems use stable Float32Array buffers (`useMemo`)
- Mutation in `useFrame`, `needsUpdate = true` — never recreate geometry
- `<primitive object={...}>` pattern for pre-constructed Three.js objects
- `THREE.AdditiveBlending + depthWrite: false` for glow effects
- Wave modes: `fan` (CornerWaveGroup), `circular` (CircularWaveField), `cross` (CrossWaveField)
- `initialTemplate` prop allows AI to pre-select template on open

---

## Deployment

- **Backend**: Render Web Service → auto-deploys on push to `master`
  - Build: `cd backend && npm install && npm run build`
  - Start: `cd backend && node dist/main`
- **Frontend**: Vercel → auto-deploys on push to `master`
  - Build: `cd frontend && npm install && npm run build`
  - Output: `frontend/dist`
- **Database**: Neon PostgreSQL (serverless, free tier)
  - Connection pooling via NeonDB driver

---

## Recommendations for Next Phase

1. **Replace `synchronize: true`** with TypeORM migrations for production safety
2. **Add rate limiting** to AI endpoints (prevent runaway API costs)
3. **Add content scheduling cron job** — check `scheduled_at` and auto-publish
4. **Social API integration** — Meta Graph API, TikTok Business API for real posting
5. **Role-based content access** — only content_manager role can access studio
6. **Email digest** — weekly summary of content performance to user email
7. **Export to PDF** — batch export library as PDF portfolio
8. **Content templates marketplace** — share/reuse successful post formats
