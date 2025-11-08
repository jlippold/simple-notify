const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = process.env.FCM_PROJECT_ID;
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// Initialize GoogleAuth
// The library automatically looks for credentials in standard locations, 
// including the GOOGLE_APPLICATION_CREDENTIALS env var, or individual 
// env vars like GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY if named correctly, 
// or can be configured with your existing serviceAccount object.

// You can pass the credentials you already loaded into the GoogleAuth constructor
const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    // Ensure the private key replacement is handled correctly
    private_key: process.env.GCP_PRIVATE_KEY && process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});


async function sendPushNotificationFCM(token, message, options = {}) {
  // Use auth.getAccessToken() to handle token retrieval and refresh
  const accessToken = await auth.getAccessToken();

  if (!PROJECT_ID) {
    throw new Error('FCM_PROJECT_ID environment variable is not set.');
  }

  const payload = {
    message: {
      token,
      notification: {
        title: options.title || 'Notification',
        body: message,
      },
      data: options.data || {},
    },
  };

  const response = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      // Use the dynamically fetched access token
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Better error logging using response.json() if it's a JSON error response
    const errorBody = await response.json(); 
    console.error('FCM API Error Details:', errorBody);
    throw new Error(`FCM error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.name; // message ID
}

module.exports = { sendPushNotificationFCM };