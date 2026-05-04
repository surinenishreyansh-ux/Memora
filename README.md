# Memora - AI Event Memory Platform

Memora is a full-stack platform built for photographers to upload event photos, which are processed using AI to cluster faces. Guests can open a public link, circle their face, and instantly get their personal gallery.

## Features Built
- **Studio Dashboard:** Dark luxury theme, create events, upload photos, trigger AI processing.
- **Guest Experience:** Clean premium mobile-first UI, canvas-based face selection.
- **AI Service Layer:** AWS Rekognition integration with a full `MOCK_AI_MODE` fallback.
- **Image Hosting:** Cloudinary integration for robust media delivery.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, Framer Motion
- Backend: Node.js, Express, MongoDB, Mongoose
- Cloud & AI: Cloudinary, AWS Rekognition

## Quick Setup Guide

### Prerequisites
- Node.js installed
- MongoDB installed (or Atlas URI)
- Cloudinary account

### 1. Backend Setup
1. Open the `backend` directory.
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your variables. By default `MOCK_AI_MODE=true` is set.
4. Run `npm run dev` to start the server on port 5000.

### 2. Frontend Setup
1. Open the `frontend` directory.
2. Run `npm install`
3. Run `npm run dev` to start the Vite app on port 5173.

### 3. Usage (Mock Mode)
1. Go to `http://localhost:5173`.
2. Create a studio account and login.
3. Create an Event and upload sample images.
4. Click "Process with AI" (this will group the photos randomly in mock mode).
5. Copy the Guest Link and open it.
6. Select any photo, draw a circle around a face, and get your mocked results!

### Using Real AWS Rekognition
Set `MOCK_AI_MODE=false` in your `.env` and provide valid `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with permissions for Rekognition (`rekognition:CreateCollection`, `rekognition:IndexFaces`, `rekognition:SearchFacesByImage`).

Enjoy Memora!
