import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

// The exact OAuth scopes configured for Google Workspace Drive and User Profile
export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const createProvider = (forceSelectAccount = false): GoogleAuthProvider => {
  const p = new GoogleAuthProvider();
  SCOPES.forEach((scope) => p.addScope(scope));
  if (forceSelectAccount) {
    p.setCustomParameters({
      prompt: 'select_account',
    });
  }
  return p;
};

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const PROFILE_STORAGE_KEY = 'expitrack_user_profile';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Nazmul Hoque',
  email: 'nazmulsa213@gmail.com',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  vaultName: "Nazmul's Master Vault",
  plan: 'Pro Lifetime Vault Owner',
  isGoogleLinked: false,
};

export const GUEST_USER_PROFILE: UserProfile = {
  name: 'Guest User',
  email: 'Local Vault (Offline)',
  avatarUrl:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  vaultName: 'Personal Local Vault',
  plan: 'Free Local Vault',
  isGoogleLinked: false,
};

export const getStoredProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
};

export const saveStoredProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save user profile:', e);
  }
};

/**
 * Initializes Firebase Auth state listener.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Trigger Google Sign In popup with Drive & Profile scopes.
 * If forceSelectAccount is true, it forces Google's account chooser UI.
 */
export const googleSignIn = async (
  forceSelectAccount = false
): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const provider = createProvider(forceSelectAccount);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from credentials');
    }

    cachedAccessToken = credential.accessToken;

    // Update local profile with authenticated Google user details
    const existing = getStoredProfile();
    const updated: UserProfile = {
      ...existing,
      name: result.user.displayName || existing.name || 'Google User',
      email: result.user.email || existing.email,
      avatarUrl: result.user.photoURL || existing.avatarUrl,
      isGoogleLinked: true,
      googleUid: result.user.uid,
    };
    saveStoredProfile(updated);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Switch Account: signs out of current session and prompts user to choose or add another Google account.
 */
export const googleSwitchAccount = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Pre-switch signout notice:', e);
  }
  cachedAccessToken = null;
  return googleSignIn(true);
};

/**
 * Returns currently cached Google access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out from Google Auth and clear in-memory token.
 * Option to reset profile to guest state.
 */
export const googleSignOut = async (resetToGuest = false): Promise<UserProfile> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out notice:', err);
  }
  cachedAccessToken = null;

  let updated: UserProfile;
  if (resetToGuest) {
    updated = { ...GUEST_USER_PROFILE };
  } else {
    const existing = getStoredProfile();
    updated = {
      ...existing,
      isGoogleLinked: false,
      googleUid: undefined,
    };
  }
  saveStoredProfile(updated);
  return updated;
};
