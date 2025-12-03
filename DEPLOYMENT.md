# ZenyFit Deployment Guide

This guide covers deploying ZenyFit to **Vercel** (frontend + API).

## Prerequisites

Before deploying, ensure you have:
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free tier available)
- A [Firebase](https://console.firebase.google.com) project with:
  - Authentication enabled (Email/Password)
  - Firestore database created
  - Service account key generated
- [Node.js](https://nodejs.org) installed (v18+)

---

## Part 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" and follow the wizard
3. Enable Google Analytics (optional)

### 1.2 Enable Authentication

1. Go to Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Save

### 1.3 Create Firestore Database

1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location close to your users

### 1.4 Get Firebase Configuration

1. Go to Project Settings > General
2. Under "Your apps", click the web icon (</>)
3. Register your app and copy the config values:
   - `apiKey`
   - `authDomain`
   - `projectId`

### 1.5 Generate Service Account Key

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. **Keep this file secure - never commit it to git!**

### 1.6 Deploy Firestore Security Rules

1. Go to Firebase Console > Firestore > Rules
2. Copy the contents of `firestore.rules` from this project
3. Paste and publish

---

## Part 2: Deploy to Vercel

### 2.1 Push to GitHub

1. Create a new GitHub repository
2. Push the entire `zenyfit-app` folder:

```bash
cd zenyfit-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zenyfit-app.git
git push -u origin main
```

### 2.2 Connect to Vercel

1. Go to [Vercel](https://vercel.com) and sign in with GitHub
2. Click "Add New" > "Project"
3. Import your `zenyfit-app` repository
4. **Important:** Set Framework Preset to "Other"
5. Leave other settings as default

### 2.3 Configure Environment Variables

In your Vercel project settings (Settings > Environment Variables), add:

| Variable | Value | Required |
|----------|-------|----------|
| `FIREBASE_API_KEY` | Your Firebase API key | Yes |
| `FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Yes |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID | Yes |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Entire JSON content** of service account key | Yes |
| `FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Optional |
| `FIREBASE_MESSAGING_SENDER_ID` | Your sender ID | Optional |
| `FIREBASE_APP_ID` | Your app ID | Optional |
| `MASTER_INVITE_CODE` | Any secret code for initial signups | Yes |

**Important:** For `FIREBASE_SERVICE_ACCOUNT_KEY`, paste the entire JSON content from your downloaded service account key file.

### 2.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

---

## Part 3: First User Setup

1. Visit your Vercel URL
2. Click "Sign Up"
3. Enter your `MASTER_INVITE_CODE`
4. Create your account
5. Generate invite codes for other users from your profile

---

## Updating Your App

Push changes to GitHub - Vercel automatically rebuilds and deploys.

```bash
git add .
git commit -m "Your changes"
git push
```

---

## Troubleshooting

### "Server not configured" error
- Verify all required environment variables are set in Vercel
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` contains the full JSON
- Redeploy on Vercel after adding variables

### CORS errors
- Ensure your Vercel deployment has the latest code with CORS headers
- Check browser console for specific error messages

### Authentication errors
- Ensure Firebase Auth is enabled
- Verify `FIREBASE_AUTH_DOMAIN` matches your Firebase config

### Database errors
- Check that Firestore is created and in the correct region
- Verify security rules are deployed

### Frontend not loading
- Check Vercel deployment logs for build errors
- Ensure `vercel.json` configuration is correct

---

## Custom Domain (Optional)

1. Go to your Vercel project settings > Domains
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Follow DNS configuration instructions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                        Vercel                           │
│                                                         │
│  ┌─────────────────────┐     ┌─────────────────────┐   │
│  │                     │     │                     │   │
│  │   Static Frontend   │────>│   API Functions     │   │
│  │   (React + Vite)    │     │   (Serverless)      │   │
│  │                     │     │                     │   │
│  └─────────────────────┘     └──────────┬──────────┘   │
│                                         │              │
└─────────────────────────────────────────┼──────────────┘
                                          │
                                          │ Firebase Admin SDK
                                          │
                               ┌──────────▼──────────┐
                               │                     │
                               │  Firebase Services  │
                               │  - Firestore (DB)   │
                               │  - Auth (Users)     │
                               │                     │
                               └─────────────────────┘
```
