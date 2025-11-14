'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged, IdTokenResult } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// --- NEW INTERFACE FOR USER DATA FROM FIRESTORE ---
interface FirestoreUser {
  roles?: string[];
  // other fields from your user document can be added here
}

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
  firestoreUser: FirestoreUser | null; // Add firestore user data
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
  firestoreUser: FirestoreUser | null; // Add firestore user data
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
  firestoreUser: FirestoreUser | null; // Add firestore user data
}

export interface UserHookResult {
  user: User | null;
  claims: IdTokenResult | null;
  isUserLoading: boolean;
  userError: Error | null;
  firestoreUser: FirestoreUser | null; // Add firestore user data
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const storage = useMemo(() => getStorage(firebaseApp), [firebaseApp]);

  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: auth.currentUser,
    claims: null,
    isUserLoading: true,
    userError: null,
    firestoreUser: null, // Initialize
  });

  useEffect(() => {
    setUserAuthState(current => ({ ...current, isUserLoading: true, userError: null }));

    const unsubscribeIdToken = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            // Set initial state, firestoreUser will be loaded by the other useEffect
            setUserAuthState(current => ({ ...current, user: firebaseUser, claims: idTokenResult, isUserLoading: false, userError: null }));
          } catch (error) {
            console.error("FirebaseProvider: Error getting ID token:", error);
            setUserAuthState(current => ({ ...current, user: firebaseUser, claims: null, isUserLoading: false, userError: error as Error }));
          }
        } else {
          setUserAuthState({ user: null, claims: null, isUserLoading: false, userError: null, firestoreUser: null });
        }
      }
    );

    return () => unsubscribeIdToken();
  }, [auth]);

  // --- NEW useEffect to listen to Firestore user document ---
  useEffect(() => {
    if (userAuthState.user?.uid) {
      const userDocRef = doc(firestore, 'users', userAuthState.user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            setUserAuthState(current => ({ ...current, firestoreUser: docSnap.data() as FirestoreUser }));
          } else {
            setUserAuthState(current => ({ ...current, firestoreUser: null }));
          }
        },
        (error) => {
          console.error("FirebaseProvider: Error listening to user document:", error);
          setUserAuthState(current => ({ ...current, userError: error }));
        }
      );
      return () => unsubscribeFirestore();
    } else {
      // No user, clear firestoreUser data
      setUserAuthState(current => ({...current, firestoreUser: null}));
    }
  }, [userAuthState.user, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    return {
      areServicesAvailable: !!(firebaseApp && firestore && auth && storage),
      firebaseApp,
      firestore,
      auth,
      storage,
      user: userAuthState.user,
      claims: userAuthState.claims,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      firestoreUser: userAuthState.firestoreUser, // Provide firestoreUser
    };
  }, [firebaseApp, firestore, auth, storage, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    claims: context.claims,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    firestoreUser: context.firestoreUser, // Provide firestoreUser
  };
};

// Other hooks remain the same...

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  return storage;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/**
 * Hook specifically for accessing the authenticated user's state, now including Firestore data.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  const { user, claims, isUserLoading, userError, firestoreUser } = context;
  return { user, claims, isUserLoading, userError, firestoreUser };
};
