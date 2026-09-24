import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import { db } from "./firebaseAdmin"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

const app = new Hono()
app.use("*", cors({
    origin: "http://localhost:5173"
}))
// hono gives context object and sends back whoever requested
app.get("/", (c) => {
    return c.text("Movie Night Matcher API is running")
})

serve({
    // when request arrives, give to Hono
    fetch: app.fetch,
    port: 3000
})

app.post("/api/rooms", async (c) => {
    // read request
    const data = await c.req.json()
    console.log(data.roomCode)
    
    // find room
    // reference to rooms collection
    const roomRef = db.collection("rooms")
    // similar to address
    const roomDoc = roomRef.doc(data.roomCode)
    // to CREATE
    await roomDoc.set({
        roomCode: data.roomCode,
        creator: "temporary-user",
        members: ["temporary-user"]
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
    // wait for Firestore to finish update
    await roomDoc.update({
        members: FieldValue.arrayUnion("temporary-user-2")
    })
    return c.json({
        message: "Room joined"
    })
})

