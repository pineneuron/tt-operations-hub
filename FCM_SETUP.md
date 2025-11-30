# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for real-time push notifications in the application.

## Prerequisites

- A Firebase account (free tier is sufficient)
- Node.js 18+ installed
- Access to your Firebase project

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Follow the setup wizard (enable Google Analytics if desired)

## Step 2: Add Web App to Firebase

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "Operations Hub Web")
5. Copy the Firebase configuration values

## Step 3: Enable Cloud Messaging

1. In Firebase Console, go to **Build** > **Cloud Messaging**
2. If not already enabled, click "Enable Cloud Messaging API"
3. Go to **Cloud Messaging** tab
4. Scroll to "Web Push certificates" section
5. Click "Generate key pair" to create a VAPID key
6. Copy the generated VAPID key

## Step 4: Get Service Account Key (Server-side)

1. In Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click "Generate new private key"
3. A JSON file will be downloaded - **keep this secure!**
4. Copy the entire JSON content

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Firebase Web App Configuration (from Step 2)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key  # From Step 3

# Firebase Admin SDK (from Step 4)
# Paste the entire JSON as a single-line string
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Important:** 
- For `FIREBASE_SERVICE_ACCOUNT_KEY`, you need to convert the JSON to a single line
- You can use a JSON minifier or escape it properly
- Never commit this file to version control

## Step 6: Service Worker Configuration

The service worker (`public/firebase-messaging-sw.js`) automatically fetches Firebase configuration from the `/api/fcm/config` endpoint, which reads from your environment variables.

**No manual configuration needed!** The service worker will:
1. Fetch config from the API endpoint on initialization
2. Initialize Firebase with the fetched config
3. Handle background push notifications automatically

Just make sure your environment variables are set correctly (Step 5).

## Step 7: Test the Setup

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Open your application in a browser (Chrome or Firefox recommended)

3. When you first visit the app, the browser will ask for notification permission
   - Click "Allow" to enable push notifications

4. Check the browser console for any errors

5. Test notifications by:
   - Checking in/out for attendance (admins should receive notifications)
   - Submitting a leave request (admins should receive notifications)
   - Approving/rejecting a leave (employee should receive notification)

## How It Works

1. **Client-side (Browser)**:
   - The app requests notification permission
   - FCM token is generated and saved to the database
   - Service worker handles background notifications
   - Foreground notifications are handled by the React app

2. **Server-side**:
   - When notifications are created (attendance, leaves, etc.)
   - The system fetches FCM tokens for target users
   - Push notifications are sent via Firebase Admin SDK
   - Notifications appear even when the app is closed

## Troubleshooting

### Notifications not appearing?

1. **Check browser console** for errors
2. **Verify service worker** is registered:
   - Open DevTools > Application > Service Workers
   - Check if `firebase-messaging-sw.js` is registered
3. **Check notification permission**:
   - Open DevTools > Application > Notifications
   - Ensure permission is "Granted"
4. **Verify environment variables** are set correctly
5. **Check Firebase Console** for any errors in Cloud Messaging

### Service worker not loading?

1. Ensure `firebase-messaging-sw.js` is in the `public/` folder
2. Check that the file is accessible at `/firebase-messaging-sw.js`
3. Clear browser cache and reload

### FCM token not being saved?

1. Check browser console for errors
2. Verify `/api/fcm/token` endpoint is working
3. Check database for `fcm_tokens` table entries

## Production Deployment

For production (e.g., Vercel):

1. Set all environment variables in your hosting platform
2. Ensure `firebase-messaging-sw.js` is deployed with your app
3. Test notifications in production environment
4. Monitor Firebase Console for usage and errors

## Mobile App Integration (Future)

When you build your mobile app:

1. Add Firebase SDK to your mobile app (React Native, Flutter, etc.)
2. Use the same Firebase project
3. FCM tokens from mobile will be stored in the same `fcm_tokens` table
4. Push notifications will work for both web and mobile users

## Security Notes

- Never expose `FIREBASE_SERVICE_ACCOUNT_KEY` in client-side code
- Keep service account keys secure
- Use environment variables for all sensitive data
- Regularly rotate service account keys

## Support

For issues or questions:
- Check [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- Review browser console errors
- Check Firebase Console for delivery reports

