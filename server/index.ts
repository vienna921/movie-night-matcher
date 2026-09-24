import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import { db } from "./firebaseAdmin"

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
    const data = await c.req.json()
    console.log(data.roomCode)
    
    // reference to rooms collection
    const roomRef = db.collection("rooms")
    // like address
    const roomDoc = roomRef.doc(data.roomCode)
    await roomDoc.set({
        roomCode: data.roomCode
    })

    return c.json({
        message: "Room received!"
    })
})

