import {
  initializeApp,
  getApps,
  getApp,
  getAuth,
  getFirestore,
  getStorage,
} from './firebaseClient'
import type { FirebaseApp, Auth, Firestore, FirebaseStorage } from './firebaseClient'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKey',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'siteyonetim-4e92e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'siteyonetim-4e92e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'siteyonetim-4e92e.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export function isFirebaseConfigured(): boolean {
  const pid = firebaseConfig.projectId
  return Boolean(pid && pid !== 'YOUR_PROJECT_ID')
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} catch (err) {
  console.warn('Firebase initialization note:', err)
}

export { app, auth, db, storage }
