# Movie Night Matcher
A full-stack web app that helps friends or families decide what movie to watch together. Users can create or join a room, browse through movies from TMDB, vote on movies in real time, and overall find movies most people agree on.

# Features
* Firebase email/password authentication
* Create and join rooms with random room codes
* browse popular movies using TMDB API
* search movies and filter by genre
* like or pass on movies
* real time voting and member updates with Firestore
* real time group chat
* match movies based on group votes
* multiple rounds of votings when movies have same match tier
* rooms expire after 24 hours
* responsive movie browsing interface

# Tech Stack
## Frontend
* React
* TypeScript
* Vite

## Backend
* Hono
* Node.js
* TypeScript

## Database & Authentication
* Firebase Authentication
* Cloud Firestore
* Firebase Admin SDK

## External API
* TMDB API

## Deployment
* Render

# Architecture
┌──────────────────────┐
│      React + Vite    │
│      Frontend        │
└──────────┬───────────┘
           │
           │ REST API
           ▼
┌──────────────────────┐
│   Hono + Node.js     │
│      Backend         │
└───────┬────────┬─────┘
        │        │
        │        │
        ▼        ▼
┌────────────┐  ┌────────────┐
│ Firestore  │  │  TMDB API  │
│ Auth/Data  │  │ Movie Data │
└────────────┘  └────────────┘

# Live Demo
Frontend: https://movie-night-matcher-frontend-p88r.onrender.com

Backend: https://movie-night-matcher.onrender.com

# Running Locally
1. Clone repository
* git clone https://github.com/vienna921/movie-night-matcher.git
2. Install dependencies
* npm install
3. Configure environment variables
* Create a .env file for frontend: VITE_API_URL=http://localhost:3000
* Configure backend Firebase and TMDB environment variables separately
4. Start backend
npx tsx server/index.ts
5. Start frontend (http://localhost:5173)
npm run dev

# Security
* Firebase Authentication protects user accounts
* backend routes verify Firebase ID tokens before performing authenticated actions
* Firestore security rules require authentication
* API keys and Firebase credentials stored in environment variables and excluded from Git

# What I Learned
I experienced building and deploying a full-stack TypeScript application while working with REST APIs, Firebase Authentication, Firestore real-time listeners, backend authentication, environment variables, CORS, and production deployment.

# Future Improvements
* More advanced matching algorithms
* More detailed movie information
* Improved room or member permissions
* Better UI

# Author
Vienna Tan