import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import { db } from "./firebaseAdmin"
import { FieldValue } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

const app = new Hono()
// middleware
app.use("*", cors({
    origin: "http://localhost:5173"
}))
// hono gives context object and sends back whoever requested
app.get("/", (c) => {
    return c.text("Movie Night Matcher API is running")
})


app.post("/api/rooms", async (c) => {
    // read request
    const data = await c.req.json()
    const authHeader = c.req.header("Authorization")
    if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401)
    }
    const token = authHeader.split(" ")[1]
    if (!token) {
        return c.json({ error: "Missing token" }, 401)
    }
    // is token issued by Firebase and untampered?
    let uid: string
    try {
        const decodedToken = await getAuth().verifyIdToken(token)
        uid = decodedToken.uid
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }
    console.log(data.roomCode)
    
    // find room
    // reference to rooms collection
    const roomRef = db.collection("rooms")
    // similar to address
    const roomDoc = roomRef.doc(data.roomCode)
    // to CREATE
    await roomDoc.set({
        roomCode: data.roomCode,
        creator: uid,
        members: [uid]
    })

    return c.json({
        message: "Room received!"
    })
})

app.post("/api/rooms/join", async (c) => {
    const data = await c.req.json()
    const roomDoc = db.collection("rooms").doc(data.roomCode)
    // check if exists
    // to READ
    const snapshot = await roomDoc.get()
    if (!snapshot.exists) {
        return c.json({
            error: "Room not found"
        }, 404)
    }

    const authHeader = c.req.header("Authorization")
    if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401)
    }
    const token = authHeader.split(" ")[1]
    if (!token) {
        return c.json({ error: "Missing token" }, 401)
    }
    let uid: string
    // is token issued by Firebase and untampered?
    try {
        const decodedToken = await getAuth().verifyIdToken(token)
        uid = decodedToken.uid
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }

    // wait for Firestore to finish update
    await roomDoc.update({
        members: FieldValue.arrayUnion(uid)
    })
    return c.json({
        message: "Room joined"
    })
})

// start server
serve({
    // when request arrives, give to Hono
    fetch: app.fetch,
    port: 3000
})
