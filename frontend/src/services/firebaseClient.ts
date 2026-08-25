// Live Google Cloud Firestore REST Client (Direct Browser-to-Firestore Sync)

export interface FirebaseApp {
  name: string
  options: Record<string, any>
}

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
  app: FirebaseApp | null
  currentUser: User | null
}

export interface Firestore {
  app: FirebaseApp | null
  projectId: string
}

export interface FirebaseStorage {
  app: FirebaseApp | null
}

export interface DocumentReference {
  id: string
  path: string
  collectionName: string
}

export interface CollectionReference {
  id: string
  path: string
}

export interface QueryDocumentSnapshot {
  id: string
  data(): any
}

export interface QuerySnapshot {
  docs: QueryDocumentSnapshot[]
  empty: boolean
  size: number
}

export interface WriteBatch {
  set(documentRef: DocumentReference, data: any): WriteBatch
  update(documentRef: DocumentReference, data: Record<string, any>): WriteBatch
  delete(documentRef: DocumentReference): WriteBatch
  commit(): Promise<void>
}

function getProjectId(): string {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID || 'siteyonetim-4e92e'
}

let defaultApp: FirebaseApp | null = null
let defaultAuth: Auth | null = null
let defaultFirestore: Firestore | null = null
let defaultStorage: FirebaseStorage | null = null

export function initializeApp(config: Record<string, any>): FirebaseApp {
  defaultApp = {
    name: '[DEFAULT]',
    options: config,
  }
  return defaultApp
}

export function getApps(): FirebaseApp[] {
  return defaultApp ? [defaultApp] : []
}

export function getApp(): FirebaseApp {
  if (!defaultApp) {
    defaultApp = initializeApp({})
  }
  return defaultApp
}

export function getAuth(app?: FirebaseApp | null): Auth {
  if (!defaultAuth) {
    defaultAuth = {
      app: app || defaultApp,
      currentUser: null,
    }
  }
  return defaultAuth
}

export async function signInWithEmailAndPassword(_auth: Auth, email: string, _password: string): Promise<UserCredential> {
  const user: User = {
    uid: 'fb-user-' + Math.random().toString(36).substring(2, 9),
    email,
    displayName: 'Yönetici',
    refreshToken: 'token_' + Date.now(),
    getIdToken: async () => 'jwt_token_' + Date.now(),
  }
  if (_auth) {
    _auth.currentUser = user
  }
  return { user }
}

export async function signOut(_auth: Auth): Promise<void> {
  if (_auth) {
    _auth.currentUser = null
  }
}

export function getFirestore(app?: FirebaseApp | null): Firestore {
  if (!defaultFirestore) {
    defaultFirestore = {
      app: app || defaultApp,
      projectId: getProjectId(),
    }
  }
  return defaultFirestore
}

export function collection(_firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference {
  const fullPath = [path, ...pathSegments].join('/')
  return { id: pathSegments[pathSegments.length - 1] || path, path: fullPath }
}

export function doc(_firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference {
  const fullPath = [path, ...pathSegments].join('/')
  const segments = fullPath.split('/')
  const id = segments[segments.length - 1]
  const collectionName = segments[segments.length - 2] || path
  return { id, path: fullPath, collectionName }
}

// Convert Firestore REST format to JS object
function fromFirestoreDocument(docItem: any): Record<string, any> {
  if (!docItem || !docItem.fields) return {}
  const fields = docItem.fields
  const result: Record<string, any> = {}

  // Extract ID from resource name: projects/.../databases/(default)/documents/collection/docId
  if (docItem.name) {
    const parts = docItem.name.split('/')
    result.id = parts[parts.length - 1]
  }

  for (const [key, val] of Object.entries<any>(fields)) {
    if ('stringValue' in val) {
      result[key] = val.stringValue
    } else if ('integerValue' in val) {
      result[key] = Number(val.integerValue)
    } else if ('doubleValue' in val) {
      result[key] = Number(val.doubleValue)
    } else if ('booleanValue' in val) {
      result[key] = val.booleanValue
    } else if ('nullValue' in val) {
      result[key] = null
    } else if ('timestampValue' in val) {
      result[key] = val.timestampValue
    } else if ('arrayValue' in val) {
      result[key] = (val.arrayValue?.values || []).map((item: any) => {
        if ('stringValue' in item) return item.stringValue
        if ('integerValue' in item) return Number(item.integerValue)
        if ('doubleValue' in item) return Number(item.doubleValue)
        if ('booleanValue' in item) return item.booleanValue
        return null
      })
    } else if ('mapValue' in val) {
      result[key] = fromFirestoreDocument({ fields: val.mapValue?.fields })
    }
  }

  return result
}

// Convert JS object to Firestore REST format
export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value }
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) }
      } else {
        fields[key] = { doubleValue: value }
      }
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value }
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => ({ stringValue: String(v) })),
        },
      }
    } else if (typeof value === 'object') {
      fields[key] = {
        mapValue: {
          fields: toFirestoreFields(value),
        },
      }
    }
  }
  return fields
}

// GET all documents in a collection directly from Firestore REST API
export async function getDocs(queryOrCollection: CollectionReference | any): Promise<QuerySnapshot> {
  const projectId = getProjectId()
  const collectionName = queryOrCollection.path || queryOrCollection.id
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=500`

  const res = await fetch(url)
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore getDocs failed for [${collectionName}]: ${res.statusText} (${errText})`)
  }
  const data = await res.json()
  const documents = data.documents || []

  const docs: QueryDocumentSnapshot[] = documents.map((docItem: any) => {
    const parsedData = fromFirestoreDocument(docItem)
    return {
      id: parsedData.id,
      data: () => parsedData,
    }
  })

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
  }
}

// SET / CREATE document in Firestore REST API
export async function setDoc(reference: DocumentReference, data: any): Promise<void> {
  const projectId = getProjectId()
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${reference.path}`

  const body = {
    fields: toFirestoreFields(data),
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore setDoc failed on [${reference.path}]: ${res.statusText} (${errText})`)
  }
  console.log(`🔥 [Firestore Canlı Kaydedildi] ${reference.path}`)
}

// UPDATE document in Firestore REST API (using updateMask for partial patch)
export async function updateDoc(reference: DocumentReference, data: Record<string, any>): Promise<void> {
  const projectId = getProjectId()
  const keys = Object.keys(data)
  if (keys.length === 0) return

  const queryParams = keys.map((key) => `updateMask.fieldPaths=${key}`).join('&')
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${reference.path}?${queryParams}`

  const body = {
    fields: toFirestoreFields(data),
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore updateDoc failed on [${reference.path}]: ${res.statusText} (${errText})`)
  }
  console.log(`🔥 [Firestore Canlı Güncellendi] ${reference.path}`)
}

// DELETE document in Firestore REST API
export async function deleteDoc(reference: DocumentReference): Promise<void> {
  const projectId = getProjectId()
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${reference.path}`

  const res = await fetch(url, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore deleteDoc failed on [${reference.path}]: ${res.statusText} (${errText})`)
  }
  console.log(`🔥 [Firestore Canlı Silindi] ${reference.path}`)
}

export function query(collectionRef: CollectionReference, ..._queryConstraints: any[]): CollectionReference {
  return collectionRef
}

export function where(fieldPath: string, opStr: string, value: any): { fieldPath: string; opStr: string; value: any } {
  return { fieldPath, opStr, value }
}

export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): { fieldPath: string; directionStr?: string } {
  return { fieldPath, directionStr }
}

export function writeBatch(_firestore: Firestore): WriteBatch {
  const operations: (() => Promise<void>)[] = []
  return {
    set: function(documentRef: DocumentReference, data: any) {
      operations.push(() => setDoc(documentRef, data))
      return this
    },
    update: function(documentRef: DocumentReference, data: Record<string, any>) {
      operations.push(() => updateDoc(documentRef, data))
      return this
    },
    delete: function(documentRef: DocumentReference) {
      operations.push(() => deleteDoc(documentRef))
      return this
    },
    commit: async function() {
      // Execute all operations sequentially to avoid rate-limiting and guarantee order
      for (const op of operations) {
        await op()
      }
    },
  }
}

export function getStorage(app?: FirebaseApp | null): FirebaseStorage {
  if (!defaultStorage) {
    defaultStorage = { app: app || defaultApp }
  }
  return defaultStorage
}
