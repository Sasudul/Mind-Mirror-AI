# MindMirror AI 🧠🪞

> **Emotion-Aware Productivity Assistant**
> MindMirror AI is an advanced, real-time productivity companion that uses computer vision and behavioral analysis to track your facial expressions, typing patterns, and stress levels. It acts as an intelligent, empathetic AI friend that helps you avoid burnout and maintain deep focus.

## ✨ Features

- **Real-Time Emotion Tracking:** Uses your webcam to detect stress, fatigue, and happiness using TensorFlow.js.
- **Conversational AI Companion:** Fully integrated with Google Gemini to act as a supportive, empathetic productivity coach that reacts to your emotions.
- **Smart Focus Mode:** Blocks distractions and provides ambient backgrounds for deep work.
- **Keystroke Dynamics:** Analyzes your typing speed and patterns to detect physical fatigue.
- **Interactive Dashboard & Analytics:** View your emotional trends, focus sessions, and productivity scores through beautiful interactive charts.
- **Secure Authentication:** Full JWT-based user authentication, including secure password reset via email verification.
- **Mistral-Inspired UI:** A premium, high-contrast, geometric user interface with smooth micro-animations and a built-in Dark Mode.

## 🛠️ Technology Stack

**Frontend:**
- Angular 17+ (Standalone Components)
- Vanilla CSS
- Chart.js for Analytics
- TensorFlow.js & face-api.js for Emotion Detection

**Backend:**
- Python 3.10+ & FastAPI
- MongoDB 
- WebSockets for Real-Time Data Streaming
- JWT & bcrypt for Security

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB (Running locally on `mongodb://localhost:27017` or via MongoDB Atlas)
- A Google Gemini API Key

### 1. Backend Setup
```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/Scripts/activate # On Windows

# Install dependencies
pip install -r requirements.txt

# Environment Variables
# Create a .env file in the backend directory:
# MONGODB_URI=mongodb://localhost:27017/mindmirror
# JWT_SECRET=your_secure_secret
# GEMINI_API_KEY=your_gemini_api_key
# SMTP_SERVER=smtp.example.com (Optional for password resets)

# Run the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
# The app will be available at http://localhost:4200
```

## 🧠 AI Companion Integration
To make the AI Companion conversational, ensure you have added your `GEMINI_API_KEY` to the backend `.env` file. The frontend will seamlessly pass your camera's emotion data to the LLM to generate context-aware, empathetic responses.

## 📄 License
This project is licensed under the MIT License.
