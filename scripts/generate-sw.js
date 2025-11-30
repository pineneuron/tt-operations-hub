/**
 * Script to generate firebase-messaging-sw.js with environment variables
 * Run this script before building: node scripts/generate-sw.js
 */

const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
const swTemplate = path.join(
  __dirname,
  '..',
  'public',
  'firebase-messaging-sw.js.template'
);
const swOutput = path.join(
  __dirname,
  '..',
  'public',
  'firebase-messaging-sw.js'
);

// Read environment variables
let envVars = {};
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

// Read template
let swContent = '';
if (fs.existsSync(swTemplate)) {
  swContent = fs.readFileSync(swTemplate, 'utf8');
} else {
  // Fallback: read existing sw file if template doesn't exist
  if (fs.existsSync(swOutput)) {
    swContent = fs.readFileSync(swOutput, 'utf8');
  } else {
    console.error('Template file not found');
    process.exit(1);
  }
}

// Replace placeholders
const config = {
  apiKey: envVars.NEXT_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket:
    envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId:
    envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    'YOUR_MESSAGING_SENDER_ID',
  appId: envVars.NEXT_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID'
};

swContent = swContent.replace(/YOUR_API_KEY/g, config.apiKey);
swContent = swContent.replace(/YOUR_AUTH_DOMAIN/g, config.authDomain);
swContent = swContent.replace(/YOUR_PROJECT_ID/g, config.projectId);
swContent = swContent.replace(/YOUR_STORAGE_BUCKET/g, config.storageBucket);
swContent = swContent.replace(
  /YOUR_MESSAGING_SENDER_ID/g,
  config.messagingSenderId
);
swContent = swContent.replace(/YOUR_APP_ID/g, config.appId);

// Write output
fs.writeFileSync(swOutput, swContent, 'utf8');
console.log('Service worker generated successfully');
