import * as admin from "firebase-admin";
import { getFirebaseAdmin } from "./firebase";

let fazmApp: admin.app.App | null = null;

/**
 * Get a Firebase Admin app initialized for the fazm-prod project.
 * Uses the same service account credentials but targets fazm-prod.
 */
export function getFazmFirebaseApp(): admin.app.App {
  if (fazmApp) return fazmApp;

  // Reuse the same credential from the main app
  const mainApp = getFirebaseAdmin();
  const credential = mainApp.options.credential;

  if (!credential) {
    throw new Error("No credential found on main Firebase app");
  }

  try {
    fazmApp = admin.initializeApp(
      {
        credential,
        projectId: "fazm-prod",
      },
      "fazm-prod"
    );
  } catch (error) {
    if ((error as Error).message.includes("already exists")) {
      fazmApp = admin.app("fazm-prod");
    } else {
      throw error;
    }
  }

  return fazmApp;
}

export function getFazmAuth(): admin.auth.Auth {
  return getFazmFirebaseApp().auth();
}
