# LuxeEstate 3D — Premium Immersive 3D Real Estate Showcase SaaS

A production-quality web application for real-estate builders and sales teams to showcase house/building projects through an interactive, collision-aware 3D spatial walkthrough.

---

## 🌟 Key Product Features

- **Public Luxury Showcase**: High-impact landing page with instant access to active published 3D property models.
- **Interactive 3D Walkthrough Engine**: Built with Three.js & React Three Fiber.
  - **Dynamic Model Loader**: Load uploaded `.glb` / `.gltf` 3D architectural models from Supabase Storage or database references.
  - **Free Exploration & WASD Movement**: Keyboard movement, mouse look, and touch controls for mobile/tablet devices.
  - **Physical Collision System**: Collision checks against walls, floor grounding, and stair step ascending/descending. User cannot walk through walls or float into space.
  - **Spatial Hotspot System**: Persisted 3D tour points with animated glowing markers, distance badges, and camera lerp transitions to target positions and orientations.
  - **Camera View Presets**: Quick access to Front, Back, Left, Right, Aerial/Top View, and Default Reset views.
  - **Translucent HUD Overlay**: Fullscreen toggle, free walk toggle, hotspot toggle, and dismissible control instructions.
- **Admin Module**:
  - **Admin Dashboard**: Executive KPIs (Users, Models, Hotspots, Visitors, Inquiries, Delivery status).
  - **3D Model Manager**: Drag-and-drop GLB file uploader with size validation, status flags (`DRAFT` / `PUBLISHED`), model replacement, and activation control.
  - **Interactive 3D Hotspot Editor**: Real-time 3D viewport for positioning hotspots spatially and setting camera targets/orientations.
  - **User & Role Management**: Provision Admin and Sales accounts with default temporary password `Pikashoot123!` and mandatory first-login password change flag (`must_change_password`).
- **Sales Module**:
  - **Sales Dashboard**: Leads KPIs, recent inquiries, and quick registration shortcuts.
  - **Mobile Inquiry Form**: Fast entry visitor registration (Name, Email, WhatsApp Phone, Inquiry Type, Notes) linked to the salesperson.
  - **Visitor Lead Manager**: Search by name/email/phone, card view on mobile, consent preference toggle, and full communication history log drawer.
- **Automated Follow-up & Notification Architecture**:
  - Scheduled 1-minute follow-up execution via background job worker (`/api/jobs/process`).
  - SendGrid Transactional Email Provider abstraction with dev mock mode fallback.
  - WhatsApp Business API Provider abstraction with dev mock mode fallback.
  - Consent & Opt-Out mechanisms respected before sending notifications.

---

## 🚀 Setup & Installation Instructions

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Supabase Database Setup
1. Create a project at [Supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Run the SQL script located in `supabase/migrations/20260821000000_init_schema.sql`.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase, SendGrid, and WhatsApp credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=sales@luxestate3d.com

WHATSAPP_PROVIDER=mock
```

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Default Demo Accounts

- **Admin Account**: `admin@luxestate.com`
- **Sales Account**: `sales@luxestate.com`
- **Initial Password**: `Pikashoot123!` *(Triggers mandatory password change flow on first login)*
