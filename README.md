# VidSphere — Production Full-Stack Video Streaming Platform

A production-ready full-stack YouTube-inspired video streaming web application built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **MongoDB (Mongoose)**, **JWT Authentication**, and **Multer + Cloudinary** media storage.

---

## 🌟 Key Features

### 1. Modern YouTube-Style User Interface
- **Responsive Layout**: Adapts cleanly across Mobile, Tablet, and Desktop.
- **Automatic sign-in**: The application starts with an active session, so account features are immediately available without a sign-in prompt.
- **Collapsible Sidebar**: Full expanded sidebar on desktop, compact icon mode on medium screens, and an overlay drawer on mobile.
- **Dark & Light Mode**: Persistent theme switcher with custom dark theme aesthetics (`#0f0f0f`) and crisp light theme.
- **Sign-in verification**: Unknown browser/device/IP contexts require an emailed OTP; optionally configured GeoIP lookups can also add city/state risk context.
- **Category Filter Pills**: Interactive slider for filtering videos (`All`, `Coding`, `Tech`, `Music`, `Gaming`, `Travel`, `Education`, etc.).
- **Skeleton Loaders & Empty States**: Polished shimmer placeholders for content loading and descriptive empty/error states.
- **Toast Notifications**: Interactive animated feedback for actions (e.g. "Saved to Watch Later", "Comment posted", "Link copied").

### 2. Complete Authentication & User System
- **JWT Authentication**: Secure Bearer token authorization persisted in `localStorage` with Axios request/response interceptors.
- **Bcrypt Password Hashing**: Passwords salted and hashed with 10 rounds.
- **Automatic Channel Creation**: Creating an account automatically configures a default channel for the user.
- **User Profile Management**: Update avatar, username, bio, and change passwords with verification.
- **Demo account**: A standard demo identity is available for trying the platform.

### 3. Video Playback & Custom HTML5 Video Player
- Custom responsive HTML5 video player with:
  - Play / Pause toggling (with big center play button).
  - Custom timeline seek bar with elapsed and total duration tracking.
  - Skip forward (+10s) and backward (-10s).
  - Volume slider and one-click mute/unmute.
  - Keyboard shortcuts (`Space` / `K` for play/pause, `M` for mute, `F` for fullscreen, `T` for theater, `C` for captions, `P` for PiP, `N` for next video, and arrow keys for seek/volume).
  - Fullscreen, theater mode, captions, Picture-in-Picture, and timeline frame previews.
- Resumes saved playback position, records completion at 90%, and offers a cancellable 10-second next-video countdown.
- **HTTP Range Video Streaming**: Backend supports `206 Partial Content` with `Accept-Ranges` and `Content-Range` for smooth video scrubbing.
- **Automatic View Tracking**: Watching a video increments views and logs it into the user's Watch History.

### 4. Interactive Video Social Features
- **Like / Dislike System**: Single atomic reaction per user per video. Real-time counter synchronization.
- **Comments System**: Add comments, inline editing for owners, delete comments with confirmation, and comment counter updates.
- **Channel Subscriptions**: Real subscribe/unsubscribe toggles that update channel subscriber counts in real time.
- **Watch Later Playlist**: Save videos with a dedicated playlist page featuring "Play All" and instant removals.
- **Watch History**: Detailed history page with individual entry removals and "Clear all history".
- **Liked Videos**: Dedicated library page listing all videos the user has liked.
- **Share Modal**: Copy direct link to clipboard.

### 5. Video Upload & Channel Customization
- **Video Upload Studio (`/upload`)**:
  - Drag-and-drop or file picker for Video file (MP4, WebM, MKV, MOV up to 150MB).
  - Custom thumbnail uploader (JPG, PNG, WebP).
  - Real animated upload progress bar tracking byte progress.
  - Title, description, category selector, tags input, and visibility controls (`public`, `unlisted`, `private`).
  - Redirects directly to the published video upon completion.
- **Channel Customization Modal**:
  - Upload custom channel banner and avatar.
  - Edit channel name, `@handle`, and description.

### 6. Full-Text Search
- Real backend API search querying video title, description, tags, and channel names.
- Matching channels showcase card with subscriber count.
- Filter and sort by Views, Upload Date, and Rating.

### 7. Unified Product Suite Derived From the Six Prior Projects
- **Live meetings and private rooms** with secure access, moderation, and collaboration patterns from the video-calling app.
- **Quota-aware media downloads** with subscription restrictions and premium access logic modeled after the download manager.
- **Billing dashboard** with Razorpay/Stripe-ready plan flows for checkout and billing history.
- **Advanced playback controls** and immersion from the custom player project.
- **Security monitoring and OTP-trust flows** for login verification and adaptive account protection.
- **Multilingual moderation and reporting** for community-safe discussion and review queues.
- These capabilities are surfaced under the main `/suite` hub and the navigation shell inside VidSphere.
- Live meetings use a six-person WebRTC mesh, HTTP-polled signaling, optional TURN, and local-only recording; this is not a 50-person SFU or independently verified end-to-end encryption.
- Paid media access is streamed through a short-lived membership-checked proxy. Remote premium media must be HTTPS from a host listed in `VIDEO_MEDIA_HOSTS` (Cloudinary by default).
- Billing currently implements Razorpay only; memberships are one-time purchases and do not automatically renew. Stripe checkout and email-based OTP require configured credentials.

---

## 📁 Project Structure

```
Youtube/
├── backend/
│   ├── config/
│   │   ├── db.js             # Mongoose connection with MongoDB Memory Server fallback
│   │   └── cloudinary.js     # Cloudinary configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── videoController.js
│   │   ├── channelController.js
│   │   ├── commentController.js
│   │   ├── reactionController.js
│   │   ├── watchLaterController.js
│   │   ├── historyController.js
│   │   └── searchController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Channel.js
│   │   ├── Video.js
│   │   ├── Comment.js
│   │   ├── Reaction.js
│   │   ├── Subscription.js
│   │   ├── WatchLater.js
│   │   └── WatchHistory.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── videoRoutes.js
│   │   ├── channelRoutes.js
│   │   ├── commentRoutes.js
│   │   ├── watchLaterRoutes.js
│   │   ├── historyRoutes.js
│   │   └── searchRoutes.js
│   ├── utils/
│   │   └── seeder.js         # Realistic demo seed data
│   ├── uploads/
│   │   ├── videos/
│   │   └── thumbnails/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Navbar, Sidebar, VideoCard, SkeletonCard, Modal
│   │   │   ├── video/        # VideoPlayer, CommentSection, RelatedVideos
│   │   │   ├── channel/      # ChannelModal
│   │   │   └── auth/         # ProtectedRoute
│   │   ├── context/          # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/            # Home, Video, Search, Upload, Channel, History, etc.
│   │   ├── services/         # Axios API instance and service endpoints
│   │   ├── utils/            # Formatters for views, dates, durations, media
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
├── package.json              # Root orchestration script
└── README.md
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- MongoDB (Optional: The backend includes an automated in-memory MongoDB fallback in development, so it runs immediately out-of-the-box even without a local MongoDB service!)

### 1. Install Dependencies

In the root directory, install dependencies for both frontend and backend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)

Create `backend/.env` (a template is provided in `backend/.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/viewtube
JWT_SECRET=super_secret_viewtube_jwt_key_2026_xyz
JWT_EXPIRE=7d
CLIENT_URL=https://viewtube-frontend-qfwz.onrender.com,http://localhost:5173

# Optional: Cloudinary Storage (Leave blank for high-performance local disk storage with HTTP range streaming)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Sign-in OTP and trusted devices
OTP_SECRET=
TRUSTED_DEVICE_DAYS=30
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Paid memberships and community moderation
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
MODERATOR_KEY=
BLOCKED_TERMS=
TRANSLATE_API_URL=
TRANSLATE_API_KEY=

# Approved HTTPS source domains for remotely hosted media
VIDEO_MEDIA_HOSTS=res.cloudinary.com

# Optional trusted GeoIP endpoint returning city/state/country/latitude/longitude JSON.
# The service receives the user's IP address when this is configured.
GEOIP_LOOKUP_URL=
```

### Frontend Configuration (`frontend/.env`)

Create `frontend/.env` (a template is provided in `frontend/.env.example`):

```env
VITE_API_URL=/api
VITE_TURN_URL=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

`GEOIP_LOOKUP_URL` may contain `{ip}` as a placeholder and should point to a GeoIP provider you trust. Without it, login history records browser/device/IP data but no geographic location. Email OTP and receipts require SMTP configuration. Razorpay test or live credentials are required to activate paid plans. Translation requires a LibreTranslate-compatible provider URL. TURN is strongly recommended for meetings behind restrictive NATs.

For the deployed Render services, set the backend's `MONGODB_URI` to the Atlas
connection string, `NODE_ENV=production`, `JWT_SECRET`, and `CLIENT_URL` to
`https://viewtube-frontend-qfwz.onrender.com`. Set the frontend's `VITE_API_URL`
to `https://viewtube-backend-mdvu.onrender.com/api`. A production frontend build also
uses the Render backend URL if `VITE_API_URL` is unset or left as `/api`.
The MongoDB connection string must be kept in the backend environment settings
and must not be committed to the repository.

---

## 🚀 Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

*The backend will automatically connect to MongoDB (or launch the in-memory MongoDB fallback) and auto-seed 10 realistic demo videos, channels, and comments if empty.*

Backend will be running at: `http://localhost:5000`

### 2. Start the Frontend Development Server

Open a second terminal window:

```bash
cd frontend
npm run dev
```

Frontend will be running at: `http://localhost:5173`

---

## 🔑 Demo Accounts for Instant Testing

You can use the 1-click login buttons on `/login` or sign in manually with:

| Account | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Aarav Sharma** | `aarav@viewtube.io` | `password123` | Creator |
| **Priya Nair** | `priya@viewtube.io` | `password123` | Creator |
| **CodeCraft Studio** | `sam@viewtube.io` | `password123` | Creator |
| **Lofi Pulse Radio** | `chloe@viewtube.io` | `password123` | Creator |

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user and auto-create default channel
- `POST /api/auth/login` — Sign in and receive JWT token
- `POST /api/auth/logout` — Invalidate user session
- `GET  /api/auth/me` — Retrieve current authenticated user [Protected]

### Users (`/api/users`)
- `GET  /api/users/:id` — Get public user profile
- `PUT  /api/users/profile` — Update username and avatar [Protected]
- `PUT  /api/users/password` — Change password [Protected]
- `GET  /api/users/:id/videos` — Retrieve public videos uploaded by user

### Videos (`/api/videos`)
- `GET    /api/videos` — List videos with category filter, sorting, and pagination
- `POST   /api/videos` — Upload new video and thumbnail [Protected]
- `GET    /api/videos/:id` — Get video details with like/subscribe status
- `PUT    /api/videos/:id` — Update video metadata [Protected - Owner]
- `DELETE /api/videos/:id` — Delete video and cascade data [Protected - Owner]
- `POST   /api/videos/:id/view` — Increment view counter & update watch history
- `POST   /api/videos/:id/like` — Toggle like reaction [Protected]
- `POST   /api/videos/:id/dislike` — Toggle dislike reaction [Protected]
- `GET    /api/videos/liked/my` — Get user's liked videos [Protected]
- `GET    /api/videos/stream/:filename` — HTTP byte-range video streaming (`206 Partial Content`)

### Comments (`/api/videos/:videoId/comments` & `/api/comments`)
- `GET    /api/videos/:videoId/comments` — Get video comments
- `POST   /api/videos/:videoId/comments` — Post a new comment [Protected]
- `PUT    /api/comments/:id` — Edit comment [Protected - Owner]
- `DELETE /api/comments/:id` — Delete comment [Protected - Owner]

### Channels (`/api/channels`)
- `GET  /api/channels/:id` — Get channel details and statistics
- `PUT  /api/channels/:id` — Customize channel name, handle, avatar, banner [Protected - Owner]
- `GET  /api/channels/:id/videos` — List channel uploaded videos
- `POST /api/channels/:id/subscribe` — Toggle subscribe to channel [Protected]
- `GET  /api/channels/subscriptions/my` — Get current user's subscribed channels [Protected]

### Watch Later (`/api/watch-later`)
- `GET    /api/watch-later` — Get all saved videos [Protected]
- `POST   /api/watch-later/:videoId` — Add video to Watch Later [Protected]
- `DELETE /api/watch-later/:videoId` — Remove video from Watch Later [Protected]
- `POST   /api/watch-later/:videoId/toggle` — Toggle Watch Later status [Protected]

### Watch History (`/api/history`)
- `GET    /api/history` — Get watch history entries [Protected]
- `DELETE /api/history/:videoId` — Remove single video from history [Protected]
- `DELETE /api/history` — Clear entire watch history [Protected]

### Search (`/api/search`)
- `GET /api/search?q=query&category=Tech&sort=views` — Search videos and channels
