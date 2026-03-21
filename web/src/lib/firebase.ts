import * as admin from "firebase-admin";
import * as fs from "fs";

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  let serviceAccount: admin.ServiceAccount;

  // Option 1: JSON string in FIREBASE_SERVICE_ACCOUNT_JSON (for production/Vercel)
  const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (credentialsJson) {
    try {
      serviceAccount = JSON.parse(credentialsJson);
    } catch {
      // Private key \n may become real newlines when loaded from .env
      serviceAccount = JSON.parse(credentialsJson.replace(/\n/g, "\\n"));
    }
  } else {
    // Option 2: File path in GOOGLE_APPLICATION_CREDENTIALS (for local development)
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath) {
      throw new Error(
        "Either FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS must be set"
      );
    }
    const serviceAccountJson = fs.readFileSync(credentialsPath, "utf8");
    serviceAccount = JSON.parse(serviceAccountJson);
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    // App might already be initialized
    if ((error as Error).message.includes("already exists")) {
      firebaseApp = admin.app();
    } else {
      throw error;
    }
  }

  return firebaseApp;
}

export function getAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}
