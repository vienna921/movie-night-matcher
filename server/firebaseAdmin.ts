import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore"
import serviceAccount from "../secrets/serviceAccountKey.json"

const app = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0])
})

const db = getFirestore(app)

// server/firebaseAdmin.ts
export { db }