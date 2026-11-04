import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export interface IdentityRecord {
  id: string;
  uid: string | null;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phoneNumber?: string | null;
  isEmailVerified: boolean;
  status: string;
}

export interface ProfileRecord {
  id: string;
  identityId: string;
  headline?: string | null;
  bio?: string | null;
  profession?: string | null;
  industry?: string | null;
  currentCity?: string | null;
  currentCountry?: string | null;
  linkedInUrl?: string | null;
  avatarUrl?: string | null;
}

export interface SecurityContextData {
  identity: IdentityRecord;
  profile: ProfileRecord | null;
  platformAdmin: { id: string; role: string; status: string } | null;
  associationAppointments: Array<{ id: string; officeTitle: string; scope: string; status: string }>;
  classSetAppointments: Array<{ id: string; classSetId: string | null; officeTitle: string; scope: string; status: string }>;
  verifiedMemberships: Array<{ id: string; classSetId: string; category: string; verificationStatus: string }>;
  effectivePermissions: string[];
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  securityContext: SecurityContextData | null;
  loading: boolean;
  error: string | null;
  idToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileDetails: (profile: Partial<ProfileRecord>) => Promise<boolean>;
  refreshContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [securityContext, setSecurityContext] = useState<SecurityContextData | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null); // Stored in memory ONLY
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityContext = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Server authentication returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.securityContext) {
        setSecurityContext(data.securityContext);
      }
    } catch (err: any) {
      console.error('Failed to sync security context:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await fetchSecurityContext(token);
        } catch (err: any) {
          console.error('Error fetching token:', err);
          setError(err.message);
        }
      } else {
        setIdToken(null);
        setSecurityContext(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      await fetchSecurityContext(token);

      // Log client audit event
      await fetch('/api/audit/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUTH_SIGN_IN_SUCCESS',
          targetResource: 'auth/google_popup',
          scope: 'PLATFORM',
          details: { email: result.user.email, uid: result.user.uid },
        }),
      });
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Failed to authenticate via Google.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setIdToken(null);
      setSecurityContext(null);

      await fetch('/api/audit/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUTH_SIGN_OUT',
          targetResource: 'auth/session',
          scope: 'PLATFORM',
          details: { timestamp: new Date().toISOString() },
        }),
      });
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  const updateProfileDetails = async (updates: Partial<ProfileRecord>): Promise<boolean> => {
    if (!idToken) return false;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchSecurityContext(idToken);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update profile:', err);
      return false;
    }
  };

  const refreshContext = async () => {
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken(true);
      setIdToken(token);
      await fetchSecurityContext(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        securityContext,
        loading,
        error,
        idToken,
        signInWithGoogle,
        signOut,
        updateProfileDetails,
        refreshContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
