declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string
    options: Record<string, any>
  }
  export function initializeApp(config: Record<string, any>): FirebaseApp
  export function getApps(): FirebaseApp[]
  export function getApp(name?: string): FirebaseApp
}

declare module 'firebase/auth' {
  import type { FirebaseApp } from 'firebase/app'
  export interface User {
    uid: string
    email?: string | null
    displayName?: string | null
    refreshToken?: string
    getIdToken(forceRefresh?: boolean): Promise<string>
  }
  export interface UserCredential {
    user: User
  }
  export interface Auth {
    app: FirebaseApp
    currentUser: User | null
  }
  export function getAuth(app?: FirebaseApp): Auth
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>
  export function signOut(auth: Auth): Promise<void>
  export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void): () => void
}

declare module 'firebase/firestore' {
  import type { FirebaseApp } from 'firebase/app'
  export interface Firestore {
    app: FirebaseApp
  }
  export interface DocumentData {
    [field: string]: any
  }
  export interface DocumentReference<T = DocumentData> {
    id: string
    path: string
  }
  export interface CollectionReference<T = DocumentData> {
    id: string
    path: string
  }
  export interface QueryDocumentSnapshot<T = DocumentData> {
    id: string
    data(): T
  }
  export interface QuerySnapshot<T = DocumentData> {
    docs: QueryDocumentSnapshot<T>[]
    empty: boolean
    size: number
  }
  export interface WriteBatch {
    set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch
    update(documentRef: DocumentReference<any>, data: Record<string, any>): WriteBatch
    delete(documentRef: DocumentReference<any>): WriteBatch
    commit(): Promise<void>
  }
  export function getFirestore(app?: FirebaseApp): Firestore
  export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference
  export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference
  export function getDoc(reference: DocumentReference): Promise<QueryDocumentSnapshot>
  export function getDocs(query: any): Promise<QuerySnapshot>
  export function setDoc(reference: DocumentReference, data: any, options?: { merge?: boolean }): Promise<void>
  export function updateDoc(reference: DocumentReference, data: Record<string, any>): Promise<void>
  export function deleteDoc(reference: DocumentReference): Promise<void>
  export function query(collection: CollectionReference, ...queryConstraints: any[]): any
  export function where(fieldPath: string, opStr: string, value: any): any
  export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): any
  export function writeBatch(firestore: Firestore): WriteBatch
}

declare module 'firebase/storage' {
  import type { FirebaseApp } from 'firebase/app'
  export interface FirebaseStorage {
    app: FirebaseApp
  }
  export function getStorage(app?: FirebaseApp): FirebaseStorage
}

