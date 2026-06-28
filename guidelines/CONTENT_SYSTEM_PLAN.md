# ipfundo — Social Media Content Creation System

## Project Overview
A content creation engine integrated into ipfundo that generates memes, quotes, and visuals across multiple categories and languages, with publishing automation and monetization tools.

## Access Control
Only users with the **content creation password** (set by system admin) can access this subsystem. Users click the sidebar link, enter the password, and gain access to all content tools.

---

## Phase 1: Foundation (CURRENT)
### Features
- ✅ 8 content categories: Funny, Wise, Guidance, Love, Science, Psychology, Sociology, Beliefs/Myths
- ✅ Category templates with pre-defined formats
- ✅ Text/quote generation interface
- ✅ Multilingual support placeholder (translation API integration)
- ✅ Password-gated access (admin sets password in settings)
- ✅ Content saved as tasks in the project board

### Entities
```
ContentCategory { id, name, slug, icon, color, description }
ContentTemplate { id, category_id, name, format, preview }
ContentDraft   { id, user_id, category_id, title, body, language, background, status, project_id }
ContentPassword { id, password_hash, updated_by, created_at }
```

### API Endpoints
```
GET    /api/content/categories
POST   /api/content/categories          (admin)
GET    /api/content/templates?category_id=
POST   /api/content/drafts
GET    /api/content/drafts
PATCH  /api/content/drafts/:id
DELETE /api/content/drafts/:id
POST   /api/content/drafts/:id/publish   (creates project task)
POST   /api/content/verify-password
POST   /api/content/set-password         (admin)
```

---

## Phase 2: Visual Layer
- Background options (colors, gradients, images, 3D renders)
- Personal photo & song upload (Cloudinary)
- AI art integration (DALL·E / Stability AI)
- Thumbnail generator

## Phase 3: Automation
- Publishing scheduler (Instagram, TikTok, YouTube, Twitter)
- Multi-platform API connectors
- Analytics dashboard (likes, shares, engagement)
- Best posting time AI recommendations

## Phase 4: Monetization
- Membership tiers (Patreon, Ko-fi, Gumroad integration)
- Digital products store
- Affiliate marketing tools
- Sponsorship management

## Phase 5: Scaling
- Performance optimization
- New language/region expansion
- AI-driven content recommendations
- Collaborative content creation (team features)
