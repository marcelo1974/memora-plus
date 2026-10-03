import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Question, AnswerHistoryRecord, UserSettings } from "../types";

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with the configured Database ID
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId || '(default)');

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Connection testing as prescribed by guidelines (with non-blocking safety timeout)
export async function testFirestoreConnection() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout de conexão do Firestore")), 1500)
    );
    await Promise.race([
      getDocFromServer(doc(db, "test", "connection")),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection check: client is currently offline or connecting.");
    } else {
      console.warn("Firestore inicializado em modo offline/resiliente.");
    }
  }
}

// User Profile Data
export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const FirebaseService = {
  // 1. Email & Password Registration
  async registerWithEmail(email: string, pass: string, displayName?: string): Promise<FirebaseUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    // Create initial user doc in Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      id: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || cred.user.email?.split("@")[0] || "Estudante",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return cred.user;
  },

  // 2. Email & Password Login
  async loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  },

  // 3. Google Sign-In
  async loginWithGoogle(): Promise<FirebaseUser> {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || "Estudante",
        photoURL: cred.user.photoURL || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    return cred.user;
  },

  // 4. Logout
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // 5. Password Reset
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  // 6. Listen to Auth State Changes
  onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // 7. Load Questions for User from Firestore
  async loadUserQuestions(userId: string): Promise<Question[]> {
    try {
      const qCol = collection(db, "users", userId, "questions");
      const snap = await getDocs(qCol);
      const list: Question[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Question);
      });
      return list;
    } catch (err) {
      console.error("Error loading user questions from Firestore:", err);
      throw err;
    }
  },

  // 8. Save single question to Firestore
  async saveUserQuestion(userId: string, question: Question): Promise<void> {
    try {
      const qDoc = doc(db, "users", userId, "questions", question.id);
      await setDoc(qDoc, {
        ...question,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error("Error saving user question to Firestore:", err);
    }
  },

  // 9. Batch sync multiple questions to Firestore
  async syncQuestionsBatch(userId: string, questions: Question[]): Promise<void> {
    try {
      // Chunk into batches of 450 (Firestore limit is 500)
      const chunkSize = 450;
      for (let i = 0; i < questions.length; i += chunkSize) {
        const chunk = questions.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((q) => {
          const qDoc = doc(db, "users", userId, "questions", q.id);
          batch.set(qDoc, { ...q, userId, updatedAt: new Date().toISOString() }, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Error in batch syncing questions:", err);
      throw err;
    }
  },

  // 10. Load Study History for User from Firestore
  async loadUserHistory(userId: string): Promise<AnswerHistoryRecord[]> {
    try {
      const hCol = collection(db, "users", userId, "history");
      const snap = await getDocs(hCol);
      const list: AnswerHistoryRecord[] = [];
      snap.forEach((d) => {
        list.push(d.data() as AnswerHistoryRecord);
      });
      return list;
    } catch (err) {
      console.error("Error loading user history from Firestore:", err);
      return [];
    }
  },

  // 11. Record Study History Log in Firestore
  async saveHistoryItem(userId: string, item: AnswerHistoryRecord): Promise<void> {
    try {
      const hDoc = doc(db, "users", userId, "history", item.id);
      await setDoc(hDoc, { ...item, userId }, { merge: true });
    } catch (err) {
      console.error("Error saving history log to Firestore:", err);
    }
  },

  // 12. Save User Settings to Firestore
  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      const uDoc = doc(db, "users", userId);
      await setDoc(uDoc, { settings, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error("Error saving settings to Firestore:", err);
    }
  },

  // 13. Load User Settings from Firestore
  async loadUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const uDoc = doc(db, "users", userId);
      const snap = await getDoc(uDoc);
      if (snap.exists() && snap.data()?.settings) {
        return snap.data().settings as UserSettings;
      }
      return null;
    } catch (err) {
      console.error("Error loading settings from Firestore:", err);
      return null;
    }
  }
};
