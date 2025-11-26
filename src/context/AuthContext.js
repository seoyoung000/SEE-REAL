import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";

const AuthContext = createContext({
  user: null,
  initializing: true,
  login: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error?.code === "auth/cancelled-popup-request") {
        return null;
      }
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  };

  const signupWithEmail = async ({ email, password, displayName }) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    return credential.user;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃에 실패했습니다.", error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      login: loginWithGoogle,
      loginWithGoogle,
      loginWithEmail,
      signupWithEmail,
      logout,
    }),
    [user, initializing, loginWithGoogle, loginWithEmail, signupWithEmail, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
