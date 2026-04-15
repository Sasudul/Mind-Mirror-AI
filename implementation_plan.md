# MindMirror AI — Emotion-Aware Productivity Assistant

A production-level full-stack system that tracks facial expressions and typing behavior to detect stress, focus, and burnout — then adjusts the user's workflow with AI-driven insights.

---

## Architecture Overview

```mermaid
graph TB
    subgraph Frontend ["Angular Frontend (Port 4200)"]
        A[Dashboard Page] --> B[Webcam Module]
        A --> C[Keystroke Tracker]
        A --> D[Insights Module]
        A --> E[Settings Module]
        B --> F[face-api.js — Browser Emotion Detection]
        C --> G[Keystroke Dynamics Analyzer]
    end

    subgraph Backend ["FastAPI Backend (Port 8000)"]
        H[REST API Routes]
        I[WebSocket Server]
        J[Emotion Aggregation Engine]
        K[Productivity Analytics Engine]
        L[AI Recommendation Engine]
        M[Auth Module — JWT]
    end

    subgraph Database ["MongoDB"]
        N[(Users Collection)]
        O[(Emotion Logs Collection)]
        P[(Keystroke Logs Collection)]
        Q[(Sessions Collection)]
        R[(Insights Collection)]
        S[(Recommendations Collection)]
    end

    F -->|WebSocket: emotion frames| I
    G -->|WebSocket: keystroke metrics| I
    I --> J
    I --> K
    J --> L
    K --> L
    H --> M
    L --> S
    J --> O
    K --> P
    H --> N
    H --> Q
    H --> R
```

---

## User Review Required

> [!IMPORTANT]
> **Emotion Detection Approach**: We will use **face-api.js** running entirely in the browser (client-side). This means:
> - ✅ **Privacy-first**: No webcam frames are ever sent to the server — only emotion labels + confidence scores
> - ✅ **Low latency**: No network round-trip for inference
> - ✅ **No GPU required on server**: The browser handles all CV/ML work
> - The server receives structured data like `{ emotion: "happy", confidence: 0.87, timestamp: "..." }`

> [!IMPORTANT]
> **Database Choice**: Using **MongoDB** as the primary database for:
> - Flexible schema for emotion/keystroke time-series data
> - Easy aggregation pipeline for analytics
> - Good fit for the varied shapes of productivity data
> If you prefer PostgreSQL, let me know and I'll adjust the plan.

> [!WARNING]
> **Keystroke Tracking**: The keystroke dynamics module captures **only timing data** (key hold time, flight time, typing speed, pause frequency). It does **NOT** log actual characters typed. This is essential for privacy and ethical use.

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | Angular 19 (Standalone Components) | Dashboard, real-time UI, webcam capture |
| **Emotion Detection** | face-api.js (TensorFlow.js) | Browser-side facial expression recognition |
| **Keystroke Analysis** | Custom Angular service | Capture typing rhythm metrics (no content) |
| **Real-time Transport** | WebSocket (native + FastAPI WebSocket) | Stream emotion + keystroke data to backend |
| **Backend** | Python 3.11+ / FastAPI | REST API, WebSocket server, analytics engine |
| **AI Recommendations** | scikit-learn + rule engine | Pattern recognition, break/productivity suggestions |
| **Database** | MongoDB (via Motor async driver) | Time-series emotion/keystroke data, user profiles |
| **Auth** | JWT (python-jose + bcrypt) | Secure user authentication |
| **Charts** | Chart.js (via ng2-charts) | Productivity visualizations |
| **Design System** | Custom CSS (Mistral-inspired warm amber) | Golden-amber color universe, sharp geometry |

---

## Proposed Changes

### Project Root Structure

```text
d:\Work\Sasudul\Mind-Mirror-AI\
├── frontend/                    # Angular 19 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/            # Singleton services, guards, interceptors
│   │   │   ├── shared/          # Reusable components, pipes, directives
│   │   │   ├── features/        # Feature modules (domain-driven)
│   │   │   ├── app.component.ts
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── assets/
│   │   │   └── models/          # face-api.js model weights
│   │   ├── styles/              # Global CSS design system
│   │   │   ├── variables.css
│   │   │   ├── typography.css
│   │   │   ├── components.css
│   │   │   └── styles.css
│   │   └── index.html
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── api/                 # Route handlers
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── emotions.py
│   │   │   │   ├── keystrokes.py
│   │   │   │   ├── sessions.py
│   │   │   │   ├── insights.py
│   │   │   │   ├── recommendations.py
│   │   │   │   └── users.py
│   │   │   └── websocket.py
│   │   ├── core/                # Config, security, database
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/              # Pydantic models + MongoDB schemas
│   │   │   ├── user.py
│   │   │   ├── emotion.py
│   │   │   ├── keystroke.py
│   │   │   ├── session.py
│   │   │   ├── insight.py
│   │   │   └── recommendation.py
│   │   ├── services/            # Business logic
│   │   │   ├── emotion_service.py
│   │   │   ├── keystroke_service.py
│   │   │   ├── analytics_service.py
│   │   │   ├── recommendation_service.py
│   │   │   └── session_service.py
│   │   ├── ml/                  # ML models & inference
│   │   │   ├── productivity_model.py
│   │   │   └── pattern_detector.py
│   │   └── main.py              # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml           # MongoDB + backend orchestration
├── .gitignore
└── README.md
```

---

### Component 1: Angular Frontend

#### [NEW] `frontend/` — Angular 19 Project

Initialized via `npx @angular/cli@latest new frontend --standalone --routing --style=css --ssr=false`

---

#### Design System — Global CSS

##### [NEW] `frontend/src/styles/variables.css`
Complete CSS custom properties implementing the warm amber design system:
- All color tokens: Mistral Orange `#fa520f`, Warm Ivory `#fffaeb`, Cream `#fff0c2`, Mistral Black `#1f1f1f`, full Sunshine scale
- Typography scale: 82px → 56px → 48px → 32px → 24px → 16px → 14px
- Spacing scale: 2px through 100px on 8px base grid
- Golden shadow system: 5-layer amber-tinted rgba shadows
- Zero border-radius throughout
- Responsive breakpoints

##### [NEW] `frontend/src/styles/typography.css`
- Font imports (Arial / system stack)
- Display, heading, body, caption classes
- Letter-spacing: -2.05px on display, tight on headings
- Line heights: 1.0 display → 1.5 body
- Weight 400 exclusively — hierarchy through size only
- Uppercase utilities for CTAs and section labels

##### [NEW] `frontend/src/styles/components.css`
- Button variants: Cream Surface, Dark Solid, Ghost, Text/Underline
- Card styles with golden shadow elevation
- Form input styling with cool-toned borders
- Navigation bar (transparent + dark variants)
- Badge/pill components for emotion states
- Modal/dialog containers
- Progress bars & loading skeletons
- Toast notification system

##### [NEW] `frontend/src/styles/animations.css`
- Fade-in/out transitions
- Slide-up entrance animations
- Pulse animation for live indicators
- Golden shimmer loading effect
- Smooth hover transitions on cards and buttons
- Chart entrance animations

##### [NEW] `frontend/src/styles/styles.css`
Master stylesheet importing all partials + global resets

---

#### Core Module

##### [NEW] `frontend/src/app/core/services/auth.service.ts`
- JWT token management (store, retrieve, refresh)
- Login / register / logout methods
- Auth state observable (Signal-based)
- HTTP interceptor for attaching Bearer tokens

##### [NEW] `frontend/src/app/core/services/websocket.service.ts`
- WebSocket connection management (connect, disconnect, reconnect)
- Auto-reconnect with exponential backoff
- Message serialization/deserialization
- Connection status observable
- Typed message channels for emotion and keystroke data

##### [NEW] `frontend/src/app/core/services/api.service.ts`
- Centralized HTTP client wrapper
- Base URL configuration
- Error handling and retry logic
- Request/response type safety

##### [NEW] `frontend/src/app/core/guards/auth.guard.ts`
- Route guard checking JWT validity
- Redirect to login on unauthorized

##### [NEW] `frontend/src/app/core/interceptors/auth.interceptor.ts`
- Attach JWT Bearer token to all API requests
- Handle 401 responses globally

---

#### Shared Module

##### [NEW] `frontend/src/app/shared/components/navbar/`
- Top navigation bar
- MindMirror logo (amber gradient block identity)
- Navigation links: Dashboard, Analytics, Journal, Settings
- User avatar + dropdown menu
- Connection status indicator (live dot)
- Responsive hamburger menu for mobile

##### [NEW] `frontend/src/app/shared/components/sidebar/`
- Left sidebar navigation for desktop
- Collapsible on tablet/mobile
- Quick stats panel (today's mood, focus score)
- Navigation icons with labels

##### [NEW] `frontend/src/app/shared/components/emotion-badge/`
- Colored pill/badge showing current emotion
- Animated transitions between states
- Emoji + label: 😌 Focused, 😓 Stressed, ⚠️ Burnout, 😊 Happy, 😐 Neutral

##### [NEW] `frontend/src/app/shared/components/stat-card/`
- Reusable stats card with icon, value, label, trend arrow
- Golden shadow elevation
- Warm ivory/cream backgrounds

##### [NEW] `frontend/src/app/shared/components/toast/`
- Notification toast service
- AI recommendation toasts ("Take a break — you've been stressed for 25 minutes")
- Success/warning/info variants in warm palette

##### [NEW] `frontend/src/app/shared/components/loading-skeleton/`
- Golden shimmer loading placeholders
- Card, chart, and text skeleton variants

##### [NEW] `frontend/src/app/shared/components/modal/`
- Reusable modal dialog
- Warm backdrop overlay
- Sharp corners, clean geometry

##### [NEW] `frontend/src/app/shared/components/chart-card/`
- Wrapper for chart components with title, timeframe selector
- Consistent card styling with golden shadows

---

#### Feature: Authentication

##### [NEW] `frontend/src/app/features/auth/pages/login/`
- Email + password login form
- "Remember me" toggle
- Link to register page
- Full-page warm amber gradient background
- MindMirror block identity branding
- Animated entrance

##### [NEW] `frontend/src/app/features/auth/pages/register/`
- Name, email, password, confirm password
- Onboarding preferences (work schedule, break preferences)
- Step-by-step registration flow

##### [NEW] `frontend/src/app/features/auth/auth.routes.ts`
Lazy-loaded authentication routes

---

#### Feature: Dashboard (Main Hub)

##### [NEW] `frontend/src/app/features/dashboard/pages/dashboard/`
The primary view — a real-time command center showing:

**Top Section — Live Status Bar**
- Current emotion badge with confidence %  
- Live webcam feed thumbnail (small preview, sharp corners)
- Session timer (how long you've been working)
- Current productivity score (0-100)

**Row 1 — Key Metrics Cards (4 across)**
1. **Focus Score** — percentage of time in "focused" state today
2. **Stress Level** — current rolling average stress indicator  
3. **Typing Speed** — WPM with trend arrow  
4. **Break Balance** — breaks taken vs recommended

**Row 2 — Charts (2 columns)**
- **Emotion Timeline** — Line chart showing emotion confidence over time (last 2 hours)
- **Productivity Heatmap** — Hour-by-hour productivity score for today

**Row 3 — AI Recommendations Panel**
- Real-time cards from the recommendation engine
- "Take a 5-minute break — stress level rising"
- "Your peak focus today was 10:00–11:30 AM"
- "Consider a walk — you've been sitting for 2 hours"
- Dismissible with feedback ("Helpful" / "Not now")

**Row 4 — Activity Feed**
- Scrollable timeline of today's events
- Session starts/stops, break reminders, mood transitions

##### [NEW] `frontend/src/app/features/dashboard/components/webcam-feed/`
- Live webcam video display
- face-api.js integration for real-time emotion detection
- Overlay showing detected face bounding box + emotion label
- Camera on/off toggle
- Privacy indicator (green dot = processing locally)
- Fps counter for performance monitoring

##### [NEW] `frontend/src/app/features/dashboard/components/emotion-timeline/`
- Real-time line chart (Chart.js)
- X-axis: time, Y-axis: emotion confidence scores
- Multiple series: happy, sad, angry, surprised, neutral, fearful, disgusted
- Color-coded with warm palette
- Auto-scrolling with configurable time window

##### [NEW] `frontend/src/app/features/dashboard/components/productivity-heatmap/`
- 24-hour grid showing productivity intensity
- Color gradient: low (cream) → high (Mistral Orange)
- Tooltip on hover with exact score and dominant emotion

##### [NEW] `frontend/src/app/features/dashboard/components/keystroke-monitor/`
- Real-time typing speed display (WPM)
- Typing rhythm visualizer (mini bar chart of last 60 seconds)
- Pause indicator (detects long pauses suggesting distraction)

##### [NEW] `frontend/src/app/features/dashboard/components/recommendation-card/`
- AI-generated suggestion cards
- Emoji + title + description
- Action buttons (Accept / Dismiss / Snooze)
- Contextual styling based on urgency (normal/warning/critical)

##### [NEW] `frontend/src/app/features/dashboard/services/emotion-detection.service.ts`
- face-api.js model loading and initialization
- Webcam stream management (getUserMedia)
- Frame processing loop (requestAnimationFrame)
- Emotion extraction and aggregation
- WebSocket emission of emotion data
- Performance throttling (configurable FPS cap)

##### [NEW] `frontend/src/app/features/dashboard/services/keystroke-tracker.service.ts`
- Keyboard event listeners (keydown, keyup)
- Calculate: hold time, flight time, typing speed (WPM), pause count
- Rolling window analysis (last 60s, 5min, 30min)
- WebSocket emission of keystroke metrics
- **Does NOT capture actual key content — timing only**

---

#### Feature: Analytics

##### [NEW] `frontend/src/app/features/analytics/pages/analytics/`
Deep-dive analytics page with:

**Daily Summary**
- Pie chart: emotion distribution for the day
- Focus vs. distraction time bar chart
- Total productive hours
- Comparison to weekly average

**Weekly Trends**
- Line chart: daily productivity scores (Mon-Sun)
- Emotion trend over the week
- Best day / worst day highlights
- Average typing speed trend

**Peak Performance Analysis**
- "Your most productive hours" — bar chart by hour
- "Your emotional patterns" — when stress typically peaks
- "Break effectiveness" — do breaks actually improve focus?

**Monthly Report**
- Calendar heatmap (GitHub-style) with productivity scores
- Monthly emotion summary
- Progress toward goals
- Exportable PDF report

##### [NEW] `frontend/src/app/features/analytics/components/emotion-pie-chart/`
##### [NEW] `frontend/src/app/features/analytics/components/weekly-trend-chart/`
##### [NEW] `frontend/src/app/features/analytics/components/peak-hours-chart/`
##### [NEW] `frontend/src/app/features/analytics/components/calendar-heatmap/`

---

#### Feature: Journal / History

##### [NEW] `frontend/src/app/features/journal/pages/journal/`
- Day-by-day session history
- Each entry shows: date, total focus time, dominant emotion, productivity score, AI recommendations received
- Expandable entries with detailed timeline
- Search and filter by date range, emotion, or productivity score
- Notes field — user can add personal reflections

---

#### Feature: Focus Mode

##### [NEW] `frontend/src/app/features/focus-mode/pages/focus-mode/`
A distraction-free focus timer:
- Pomodoro-style timer (25 min work / 5 min break, configurable)
- Full-screen mode with minimal UI
- Live emotion indicator (small badge)
- Real-time AI coaching ("Stay focused — you're doing great!" or "Stress rising — breathe deep")
- Session summary on completion
- Ambient background (warm gradient animation)

---

#### Feature: Settings

##### [NEW] `frontend/src/app/features/settings/pages/settings/`
- **Profile**: Name, email, avatar, password change
- **Preferences**: Work schedule (start/end times), break frequency, notification style
- **Privacy**: Camera permissions, data retention period, export/delete data
- **Appearance**: Theme adjustments (future: dark mode variant)
- **Integrations**: Future webhook/API settings
- **About**: Version, credits, privacy policy

---

#### Feature: Onboarding

##### [NEW] `frontend/src/app/features/onboarding/pages/onboarding/`
First-time user experience:
- Step 1: Welcome + camera permission request
- Step 2: Brief calibration (look at camera for 10s to establish baseline)
- Step 3: Set work schedule preferences
- Step 4: Dashboard tour (highlighted features)
- Warm, inviting design with amber gradient backgrounds

---

### Component 2: FastAPI Backend

#### [NEW] `backend/app/main.py`
- FastAPI application factory
- CORS middleware (allow Angular dev server)
- Mount API v1 router
- WebSocket endpoint registration
- Lifespan events: connect to MongoDB on startup, disconnect on shutdown
- Health check endpoint

#### [NEW] `backend/app/core/config.py`
- Pydantic Settings model loading from `.env`
- MongoDB URI, JWT secret, CORS origins, debug mode
- Model hyperparameters for recommendation engine

#### [NEW] `backend/app/core/database.py`
- MongoDB async connection via Motor
- Database and collection references
- Index creation on startup (time-series indexes for emotion/keystroke data)

#### [NEW] `backend/app/core/security.py`
- JWT token creation and verification
- Password hashing (bcrypt)
- OAuth2 password bearer scheme
- `get_current_user` dependency

---

#### API Routes

##### [NEW] `backend/app/api/v1/auth.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/auth/register` | POST | Create new user account |
| `/api/v1/auth/login` | POST | Authenticate, return JWT |
| `/api/v1/auth/me` | GET | Get current user profile |
| `/api/v1/auth/refresh` | POST | Refresh JWT token |

##### [NEW] `backend/app/api/v1/emotions.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/emotions/` | GET | Get emotion logs (with date range filter) |
| `/api/v1/emotions/summary` | GET | Get emotion summary for time period |
| `/api/v1/emotions/distribution` | GET | Get emotion distribution (pie chart data) |
| `/api/v1/emotions/timeline` | GET | Get emotion timeline data (line chart) |
| `/api/v1/emotions/current` | GET | Get latest detected emotion |

##### [NEW] `backend/app/api/v1/keystrokes.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/keystrokes/` | GET | Get keystroke metrics (with date range filter) |
| `/api/v1/keystrokes/summary` | GET | Get typing speed/rhythm summary |
| `/api/v1/keystrokes/trends` | GET | Get typing behavior trends |

##### [NEW] `backend/app/api/v1/sessions.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/sessions/` | GET | List all sessions |
| `/api/v1/sessions/current` | GET | Get current active session |
| `/api/v1/sessions/start` | POST | Start a new work session |
| `/api/v1/sessions/end` | POST | End current session |
| `/api/v1/sessions/{id}` | GET | Get session detail with full timeline |

##### [NEW] `backend/app/api/v1/insights.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/insights/daily` | GET | Get daily productivity insights |
| `/api/v1/insights/weekly` | GET | Get weekly trend analysis |
| `/api/v1/insights/monthly` | GET | Get monthly report data |
| `/api/v1/insights/peak-hours` | GET | Get optimal productivity hours |
| `/api/v1/insights/heatmap` | GET | Get productivity heatmap data |

##### [NEW] `backend/app/api/v1/recommendations.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/recommendations/` | GET | Get pending recommendations |
| `/api/v1/recommendations/{id}/dismiss` | POST | Dismiss a recommendation |
| `/api/v1/recommendations/{id}/feedback` | POST | Submit feedback (helpful/not) |

##### [NEW] `backend/app/api/v1/users.py`
| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/v1/users/profile` | GET | Get user profile |
| `/api/v1/users/profile` | PUT | Update user profile |
| `/api/v1/users/preferences` | GET | Get user preferences |
| `/api/v1/users/preferences` | PUT | Update preferences |
| `/api/v1/users/export` | GET | Export all user data (GDPR) |

---

#### WebSocket Handler

##### [NEW] `backend/app/api/websocket.py`
- `/ws/{user_id}` — bidirectional WebSocket
- Handles incoming messages:
  - `emotion_data`: Emotion label + confidence + timestamp → store in MongoDB, trigger recommendation engine
  - `keystroke_data`: Typing metrics → store in MongoDB, analyze patterns
  - `session_control`: Start/pause/end session signals
- Sends outgoing messages:
  - `recommendation`: Real-time AI suggestions pushed to client
  - `alert`: Urgent notifications (burnout detected, mandatory break)
  - `session_update`: Session statistics

---

#### Services (Business Logic)

##### [NEW] `backend/app/services/emotion_service.py`
- Aggregate raw emotion frames into 1-minute buckets
- Calculate rolling averages (5 min, 15 min, 30 min, 1 hour)
- Detect sustained negative emotions (stress > 70% for 15+ minutes = burnout warning)
- Provide data for charts and summaries

##### [NEW] `backend/app/services/keystroke_service.py`
- Process incoming keystroke metrics
- Calculate productivity indicators:
  - Sustained fast typing = high focus
  - Increasing error rate + speed = stress indicator
  - Long pauses + slow speed = fatigue/distraction
- Generate typing behavior profile over time

##### [NEW] `backend/app/services/analytics_service.py`
- Combine emotion + keystroke data into composite productivity score (0-100)
- Formula: `productivity = (focus_weight * emotion_focus_score) + (typing_weight * typing_consistency_score) - (stress_penalty * stress_level)`
- Daily/weekly/monthly aggregation
- Peak hours calculation
- Heatmap data generation
- Trend analysis (improving/declining/stable)

##### [NEW] `backend/app/services/recommendation_service.py`
Rule-based + ML-powered recommendation engine:

| Trigger | Recommendation |
|:---|:---|
| Stress > 70% for 15+ min | "Take a 5-minute break. Try deep breathing." |
| Focus score dropping over 30 min | "Your focus is declining. Consider switching tasks." |
| Typing speed 50% below baseline | "You seem fatigued. A short walk might help." |
| Continuous work for 90+ min | "You've been working for 90 minutes. Time for a break!" |
| Peak productivity time detected | "You're most productive at {time}. Schedule deep work here." |
| Session ending + high stress | "Rough session. Consider journaling to decompress." |
| Long inactive pause | "You seem distracted. Want to start a focus timer?" |
| Burnout pattern (3+ high-stress days) | "⚠️ Burnout risk detected. Consider lightening your schedule." |

##### [NEW] `backend/app/services/session_service.py`
- Session lifecycle management
- Track session duration, breaks, and interruptions
- Session scoring (combine emotion + keystroke data)
- Historical session comparison

---

#### ML Module

##### [NEW] `backend/app/ml/productivity_model.py`
- Lightweight scikit-learn model for productivity prediction
- Features: emotion history, typing patterns, time of day, day of week
- Trained on user's own data (personalized over time)
- Fallback to rule-based scoring if insufficient data

##### [NEW] `backend/app/ml/pattern_detector.py`
- Burnout pattern detection (sustained high stress over days)
- Circadian rhythm analysis (when is user most productive?)
- Anomaly detection (unusual behavior patterns)

---

#### Data Models (MongoDB Schemas)

##### [NEW] `backend/app/models/user.py`
```python
{
    "_id": ObjectId,
    "email": str,
    "name": str,
    "password_hash": str,
    "preferences": {
        "work_start": "09:00",
        "work_end": "17:00",
        "break_frequency_minutes": 60,
        "notification_style": "gentle",  # gentle | direct | minimal
        "data_retention_days": 90
    },
    "onboarding_completed": bool,
    "created_at": datetime,
    "updated_at": datetime
}
```

##### [NEW] `backend/app/models/emotion.py`
```python
{
    "_id": ObjectId,
    "user_id": ObjectId,
    "session_id": ObjectId,
    "emotion": str,           # happy, sad, angry, surprised, neutral, fearful, disgusted
    "confidence": float,      # 0.0 - 1.0
    "all_emotions": {         # Full distribution
        "happy": 0.12,
        "sad": 0.05,
        "neutral": 0.60,
        ...
    },
    "timestamp": datetime
}
```

##### [NEW] `backend/app/models/keystroke.py`
```python
{
    "_id": ObjectId,
    "user_id": ObjectId,
    "session_id": ObjectId,
    "wpm": float,                    # Words per minute
    "avg_hold_time_ms": float,       # Average key hold duration
    "avg_flight_time_ms": float,     # Average time between keys
    "pause_count": int,              # Pauses > 3 seconds
    "error_rate": float,             # Backspace frequency ratio
    "consistency_score": float,      # 0-1, how consistent the rhythm is
    "window_start": datetime,        # Start of measurement window
    "window_end": datetime,          # End of measurement window
    "timestamp": datetime
}
```

##### [NEW] `backend/app/models/session.py`
```python
{
    "_id": ObjectId,
    "user_id": ObjectId,
    "start_time": datetime,
    "end_time": datetime | None,
    "duration_minutes": float,
    "productivity_score": float,     # 0-100
    "dominant_emotion": str,
    "focus_percentage": float,
    "stress_percentage": float,
    "breaks_taken": int,
    "typing_avg_wpm": float,
    "status": str                    # active | paused | completed
}
```

##### [NEW] `backend/app/models/insight.py`
```python
{
    "_id": ObjectId,
    "user_id": ObjectId,
    "type": str,                     # daily | weekly | monthly
    "date": date,
    "productivity_score": float,
    "total_focus_hours": float,
    "total_stress_hours": float,
    "peak_hour": int,                # 0-23
    "emotion_distribution": dict,
    "typing_stats": dict,
    "generated_at": datetime
}
```

##### [NEW] `backend/app/models/recommendation.py`
```python
{
    "_id": ObjectId,
    "user_id": ObjectId,
    "session_id": ObjectId,
    "type": str,           # break | task_switch | encouragement | warning | insight
    "title": str,
    "message": str,
    "emoji": str,
    "urgency": str,        # low | medium | high | critical
    "status": str,         # pending | dismissed | accepted
    "feedback": str | None,  # helpful | not_helpful
    "created_at": datetime,
    "responded_at": datetime | None
}
```

---

### Component 3: Infrastructure

#### [NEW] `docker-compose.yml`
```yaml
services:
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    environment:
      MONGO_INITDB_ROOT_USERNAME: mindmirror
      MONGO_INITDB_ROOT_PASSWORD: <secret>

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [mongodb]
    env_file: ./backend/.env

  # Frontend runs via ng serve in development
```

#### [NEW] `backend/Dockerfile`
Multi-stage build: Python 3.11-slim, install requirements, copy app, run with uvicorn

#### [NEW] `backend/.env.example`
```env
MONGODB_URI=mongodb://mindmirror:secret@localhost:27017/mindmirror
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440
CORS_ORIGINS=http://localhost:4200
DEBUG=true
```

#### [NEW] `backend/requirements.txt`
```txt
fastapi==0.115.*
uvicorn[standard]==0.34.*
motor==3.6.*
pydantic[email]==2.10.*
pydantic-settings==2.7.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
scikit-learn==1.6.*
numpy==2.2.*
pandas==2.2.*
websockets==14.*
```

#### [NEW] `.gitignore`
Python, Node.js, Angular, environment files, IDE, OS files

#### [NEW] `README.md`
Professional README with:
- Project overview + screenshots
- Architecture diagram
- Setup instructions (frontend + backend + database)
- API documentation link
- Design system reference
- Contributing guidelines

---

## Complete Feature List

### Real-Time Features
1. ✅ Webcam-based emotion detection (face-api.js, browser-side)
2. ✅ Live emotion badge with confidence percentage
3. ✅ Real-time emotion timeline chart
4. ✅ Keystroke dynamics tracking (speed, rhythm, pauses)
5. ✅ Live typing speed (WPM) display
6. ✅ WebSocket real-time data streaming
7. ✅ Live AI recommendations ("Take a break", "Stay focused")
8. ✅ Session timer with productivity scoring

### Analytics & Insights
9. ✅ Daily productivity insights dashboard
10. ✅ Emotion distribution pie chart
11. ✅ Productivity heatmap (hour-by-hour)
12. ✅ Weekly trend analysis
13. ✅ Monthly calendar heatmap
14. ✅ Peak productivity hours identification
15. ✅ "You are most productive at 10AM" insights
16. ✅ Stress pattern detection
17. ✅ Burnout risk warning system

### Focus & Productivity
18. ✅ Pomodoro-style focus timer
19. ✅ Focus mode (distraction-free full-screen)
20. ✅ Break reminders based on emotion state
21. ✅ AI coaching during focus sessions
22. ✅ Session history & comparison

### User Features
23. ✅ User authentication (JWT)
24. ✅ Onboarding flow with camera calibration
25. ✅ User preferences & work schedule
26. ✅ Session journal with personal notes
27. ✅ Data export (GDPR compliance)
28. ✅ Privacy-first design (all emotion detection runs in browser)

### Design & UX
29. ✅ Warm amber design system (Mistral-inspired)
30. ✅ Massive display typography (82px hero)
31. ✅ Golden 5-layer shadow system
32. ✅ Sharp architectural geometry (zero border-radius)
33. ✅ Micro-animations & transitions
34. ✅ Responsive design (mobile → desktop)
35. ✅ Toast notifications for AI suggestions
36. ✅ Loading skeletons with golden shimmer

---

## Execution Order

| Phase | Tasks | Est. Time |
|:---|:---|:---|
| **Phase 1** | Project scaffolding (Angular + FastAPI + MongoDB) | ~30 min |
| **Phase 2** | Design system CSS (variables, typography, components, animations) | ~45 min |
| **Phase 3** | Backend core (config, database, auth, models) | ~45 min |
| **Phase 4** | Backend API routes (emotions, keystrokes, sessions, insights, recommendations) | ~60 min |
| **Phase 5** | Backend WebSocket handler + services | ~45 min |
| **Phase 6** | Frontend core (auth service, API service, WebSocket service, guards) | ~30 min |
| **Phase 7** | Frontend shared components (navbar, sidebar, stat-card, toast, modals) | ~45 min |
| **Phase 8** | Frontend auth feature (login, register pages) | ~30 min |
| **Phase 9** | Frontend dashboard feature (webcam feed, emotion detection, keystroke tracker) | ~60 min |
| **Phase 10** | Frontend analytics feature (charts, heatmaps, trends) | ~45 min |
| **Phase 11** | Frontend journal, focus mode, settings, onboarding features | ~45 min |
| **Phase 12** | ML module (productivity model, pattern detector) | ~30 min |
| **Phase 13** | Integration testing, Docker, README | ~30 min |

---

## Verification Plan

### Automated Tests
1. **Backend**: Run `pytest` for API route tests and service logic
2. **Frontend**: Run `ng test` for component and service unit tests
3. **Lint**: `ng lint` (frontend) + `ruff check` (backend)

### Manual Verification
1. Start MongoDB via Docker Compose
2. Start FastAPI backend (`uvicorn app.main:app --reload`)
3. Start Angular dev server (`ng serve`)
4. Register a user → complete onboarding
5. Grant webcam permission → verify live emotion detection
6. Type in a text area → verify keystroke metrics
7. Wait for AI recommendations → verify toast notifications
8. Navigate to Analytics → verify charts render with data
9. Test focus mode → verify Pomodoro timer
10. Test responsive design at mobile/tablet/desktop breakpoints
11. Record browser demo video of the full flow

---

## Open Questions

> [!IMPORTANT]
> **MongoDB Setup**: Do you have MongoDB installed locally, or should we rely entirely on Docker Compose for the database? 

> [!NOTE]
> **face-api.js Models**: The face-api.js model weights (~6MB) will be downloaded and stored in `frontend/src/assets/models/`. These are loaded once and cached by the browser.

> [!NOTE]
> **Scope Confirmation**: This plan includes 36 features across 6 feature modules. It's a substantial build. If you'd like to prioritize certain features for an MVP first and add others incrementally, let me know.
