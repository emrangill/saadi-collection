import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('AuthContext firebaseUser:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        });
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log('AuthContext Firestore userData:', userData);
            setUser({
              ...firebaseUser,
              name: userData.name || 'User',
              role: userData.role || 'buyer',
              approved: userData.approved !== undefined ? userData.approved : true
            });
            console.log('AuthContext set user:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || 'User',
              role: userData.role || 'buyer',
              approved: userData.approved !== undefined ? userData.approved : true
            });
          } else {
            console.log('AuthContext: No Firestore user document found for uid:', firebaseUser.uid);
            setUser({
              ...firebaseUser,
              name: firebaseUser.displayName || 'User',
              role: 'buyer',
              approved: true
            });
          }
        } catch (err) {
          console.error('AuthContext: Error fetching user data:', {
            message: err.message,
            code: err.code,
            stack: err.stack
          });
          setUser({
            ...firebaseUser,
            name: firebaseUser.displayName || 'User',
            role: 'buyer',
            approved: true
          });
        }
      } else {
        console.log('AuthContext: No firebaseUser (user signed out)');
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Add logout function to AuthContext
  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}