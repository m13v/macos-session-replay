# Session Replay Web Player

Web-based viewer for macOS session recordings. Plays back H.265 video chunks recorded by the Swift `SessionReplay` library.

## Features

- Device list with live status indicators and unread counts
- Video player with 1x/2x/3x playback speed
- Timeline visualization with color-coded sessions
- Keyboard navigation (arrow keys, Escape)
- Auto-advance to next chunk
- Mark as read tracking per user
- Device deletion
- AI-powered session analysis (Gemini)

## Setup

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes* | Firebase service account JSON string |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes* | Path to service account file (alternative) |
| `GEMINI_API_KEY` | No | Only needed for video analysis feature |
| `GCS_BUCKET_NAME` | No | Defaults to `fazm-session-recordings` |

\* One of `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` is required.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000

## Architecture

```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Redirects to /session-recordings
│   │   ├── session-recordings/page.tsx       # Main player UI
│   │   └── api/session-recordings/
│   │       ├── route.ts                      # List devices & recordings
│   │       ├── signed-url/route.ts           # Generate GCS signed URLs
│   │       ├── viewed/route.ts               # Get viewed chunks
│   │       ├── mark-viewed/route.ts          # Mark chunk as viewed
│   │       ├── mark-all-viewed/route.ts      # Batch mark viewed
│   │       ├── delete-device/route.ts        # Delete device recordings
│   │       └── analyze/route.ts              # AI video analysis
│   ├── lib/
│   │   ├── firebase.ts                       # Firebase Admin SDK init
│   │   ├── fazm-firebase.ts                  # fazm-prod Firebase app
│   │   ├── gcs.ts                            # GCS operations
│   │   ├── db.ts                             # Neon PostgreSQL operations
│   │   └── gemini.ts                         # Gemini video analysis
│   └── components/
│       └── NavLink.tsx                       # Client-side navigation
├── package.json
├── tsconfig.json
└── .env.example
```

## Stack

- **Next.js 16** with App Router
- **Clerk** for authentication
- **Neon** (PostgreSQL) for viewed-chunk tracking
- **Firebase Admin** for GCS access and UID resolution
- **Tailwind CSS v4** for styling
- **Gemini Pro** for optional AI video analysis
