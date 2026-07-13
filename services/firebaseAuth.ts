import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with Drive scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Attempt to load token from localStorage if not in memory
      if (!cachedAccessToken) {
        const savedToken = localStorage.getItem('google_access_token');
        const savedExpiryStr = localStorage.getItem('google_access_token_expires_at');
        const savedExpiry = savedExpiryStr ? parseInt(savedExpiryStr, 10) : 0;
        if (savedToken && savedExpiry > Date.now()) {
          cachedAccessToken = savedToken;
        }
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_access_token_expires_at');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (emailHint?: string): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const dynamicProvider = new GoogleAuthProvider();
    dynamicProvider.addScope('https://www.googleapis.com/auth/drive.file');
    dynamicProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

    // Use login_hint to bypass Google's Account Chooser screen
    const hint = emailHint || auth.currentUser?.email || localStorage.getItem('google_logged_in_email') || undefined;
    if (hint) {
      dynamicProvider.setCustomParameters({
        login_hint: hint
      });
    }

    const result = await signInWithPopup(auth, dynamicProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google.');
    }

    if (result.user.email) {
      localStorage.setItem('google_logged_in_email', result.user.email);
    }

    cachedAccessToken = credential.accessToken;
    const expiry = Date.now() + 3500 * 1000; // ~1 hour
    localStorage.setItem('google_access_token', cachedAccessToken);
    localStorage.setItem('google_access_token_expires_at', expiry.toString());

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const savedToken = localStorage.getItem('google_access_token');
  const savedExpiryStr = localStorage.getItem('google_access_token_expires_at');
  const savedExpiry = savedExpiryStr ? parseInt(savedExpiryStr, 10) : 0;
  if (savedToken && savedExpiry > Date.now()) {
    cachedAccessToken = savedToken;
    return cachedAccessToken;
  }
  return null;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    const expiry = Date.now() + 3500 * 1000;
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_access_token_expires_at', expiry.toString());
  } else {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_expires_at');
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_access_token_expires_at');
};
