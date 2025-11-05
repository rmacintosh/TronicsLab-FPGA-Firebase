'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, IdTokenResult } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage'; // Import getStorage
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// --- ADD STORAGE TO CONTEXT STATE ---
export interface FirebaseContextState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; 
  storage: FirebaseStorage | null; // Add storage
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean; 
  userError: Error | null; 
}

// --- ADD STORAGE TO RETURN TYPE ---
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage; // Add storage
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - NO CHANGE
export interface UserHookResult {
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  // --- INITIALIZE STORAGE ---
  const storage = useMemo(() => getStorage(firebaseApp), [firebaseApp]);

  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: auth.currentUser,
    claims: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    setUserAuthState(current => ({ ...current, isUserLoading: true, userError: null }));

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => { 
        if (firebaseUser) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            setUserAuthState({ user: firebaseUser, claims: idTokenResult, isUserLoading: false, userError: null });
          } catch (error) {
             console.error("FirebaseProvider: Error getting ID token:", error);
             setUserAuthState({ user: firebaseUser, claims: null, isUserLoading: false, userError: error as Error });
          }
        } else {
          setUserAuthState({ user: null, claims: null, isUserLoading: false, userError: null });
        }
      },
      (error) => { 
        console.error("FirebaseProvider: onIdTokenChanged error:", error);
        setUserAuthState({ user: null, claims: null, isUserLoading: false, userError: error });
      }
    );

    return () => unsubscribe();
  }, [auth]);

  // --- ADD STORAGE TO CONTEXT VALUE ---
  const contextValue = useMemo((): FirebaseContextState => {
    return {
      areServicesAvailable: !!(firebaseApp && firestore && auth && storage), // Add storage check
      firebaseApp,
      firestore,
      auth,
      storage, // Add storage
      user: userAuthState.user,
      claims: userAuthState.claims,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, storage, userAuthState]); // Add storage to dependency array

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) { // Add storage check
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage, // Add storage
    user: context.user,
    claims: context.claims,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

// --- ADD useStorage HOOK ---
/** Hook to access Firebase Storage instance. */
export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  return storage;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 */
export const useUser = (): UserHookResult => { 
  const context = useContext(FirebaseContext);
   if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  const { user, claims, isUserLoading, userError } = context; 
  return { user, claims, isUserLoading, userError };
};