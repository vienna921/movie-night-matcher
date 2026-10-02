import "dotenv/config"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import { db } from "./firebaseAdmin"
import { FieldValue } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { decode } from "hono/jwt"

const app = new Hono()
// middleware
app.use("*", cors({
    origin: [
                "http://localhost:5173",
                "https://movie-night-matcher-frontend-p88r.onrender.com"
            ]   
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
    let decodedToken
    try {
        decodedToken = await getAuth().verifyIdToken(token)
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
        votingRound: 1,
        members: [
            {
                uid: uid,
                email: decodedToken.email,
                lastSeen: Date.now()
            }
        ],
        roundMovieIds: [],
        expiresAt: Date.now() - 1000
    })

    return c.json({
        message: "Room received!"
    })
})

app.post("/api/rooms/:roomCode/next-round", async (c) => {
    const roomCode = c.req.param("roomCode")
    const data = await c.req.json()
    const roomRef = db.collection("rooms").doc(roomCode)
    const roomDoc = await roomRef.get()
    if (!roomDoc.exists) {
        return c.json({ error: "Room not found" }, 404)
    }

    const roomData = roomDoc.data()
    const currentRound = roomData?.votingRound ?? 1
    await roomRef.update({
        votingRound: currentRound + 1,
        roundMovieIds: data.movieIds
    })
    return c.json({
        message: "Voting round updated",
        votingRound: currentRound + 1
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

    const roomData = snapshot.data()
    if (roomData?.expiresAt && Date.now() > roomData.expiresAt) {
        return c.json({
            error: "Room has expired"
        }, 410)
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
    let decodedToken;
    // is token issued by Firebase and untampered?
    try {
        decodedToken = await getAuth().verifyIdToken(token)
        uid = decodedToken.uid
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }

    // wait for Firestore to finish update
    const members = roomData?.members || []
    const alreadyMember = members.some(
        (member: { uid: string }) => member.uid === uid
    )
    if (!alreadyMember) {
        await roomDoc.update({
            members: [
                ...members,
                {
                    uid: uid,
                    email: decodedToken.email,
                    lastSeen: Date.now()
                }
            ]
        })
    }
    return c.json({
        message: "Room joined"
    })
})

app.post("/api/rooms/:roomCode/votes", async (c) => {
    const roomCode = c.req.param("roomCode")
    const data = await c.req.json()
    const authHeader = c.req.header("Authorization")

    if (!authHeader) {
        return c.json({ error: "Missing authoriation header" }, 401)
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
        return c.json({ error: "Missing token" }, 401)
    }
    
    let uid: string
    
    try {
        const decodedToken = await getAuth().verifyIdToken(token)
        uid = decodedToken.uid
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }

    const voteId = `${uid}_${data.movieId}_round${data.round}`

    // pointer to Firestore document
    // db from firebaseAdmin.ts
    // go to rooms and votes collection and doc it
    const voteRef = db
        .collection("rooms")
        .doc(roomCode)
        .collection("votes")
        .doc(voteId)

    await voteRef.set({
        userId: uid,
        movieId: data.movieId,
        vote: data.vote,
        round: data.round
    })

    return c.json({
        message: "Vote saved"
    })
})

app.get("/api/rooms/:roomCode/votes", async (c) => {
    const roomCode = c.req.param("roomCode")

    const authHeader = c.req.header("Authorization")

    if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401)
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
        return c.json({ error: "Missing token" }, 401)
    }

    let uid: string

    try {
        const decodedToken = await getAuth().verifyIdToken(token)
        uid = decodedToken.uid
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }

    const snapshot = await db
        .collection("rooms")
        .doc(roomCode)
        .collection("votes")
        // from room's votes, only give votes belonging to current auth user
        .where("userId", "==", uid)
        .get()

    const votes = snapshot.docs.map((doc) => doc.data())

    return c.json({
        votes
    })
})

app.get("/api/movies", async (c) => {
    const response = await fetch(
        "https://api.themoviedb.org/3/movie/popular",
        {
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`
            }
        }
    )
    const data = await response.json()
    return c.json(data)
})
console.log("SERVER STARTED WITH GET VOTES ROUTE")

app.post("/api/rooms/:roomCode/heartbeat", async (c) => {
    const roomCode = c.req.param("roomCode")

    const authHeader = c.req.header("Authorization")

    if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401)
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
        return c.json({ error: "Missing token" }, 401)
    }
    
    let uid: string

    try {
        const decodedToken = await getAuth().verifyIdToken(token)
        uid = decodedToken.uid
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }

    const roomRef = db.collection("rooms").doc(roomCode)
    const roomSnapshot = await roomRef.get()

    if (!roomSnapshot.exists) {
        return c.json({ error: "Room not found" }, 404)
    }

    const roomData = roomSnapshot.data()

    const updatedMembers = (roomData?.members || []).map(
        (member: { uid: string; email: string; lastSeen: number }) => {
            if (member.uid === uid) {
                return {
                    ...member,
                    lastSeen: Date.now()
                }
            }
            return member
        }
    )
    await roomRef.update({
        members: updatedMembers
    })
    return c.json({ message: "Heartbeat updated" })
})
app.post("/api/rooms/:roomCode/messages", async (c) => {
    const roomCode = c.req.param("roomCode")
    const data = await c.req.json()

    const authHeader = c.req.header("Authorization")

    if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401)
    }
    const token = authHeader.split(" ")[1]
    if (!token) {
        return c.json({ error: "Missing token" }, 401)
    }
    let decodedToken
    try {
        decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
        return c.json({ error: "Invalid token" }, 401)
    }

    const messageRef =db
        .collection("rooms")
        .doc(roomCode)
        .collection("messages")
        .doc()

    await messageRef.set({
        uid: decodedToken.uid,
        email: decodedToken.email,
        text: data.text,
        createdAt: Date.now()
    })

    return c.json({
        message: "Message sent"
    })
})
// start server
serve({
    // when request arrives, give to Hono
    fetch: app.fetch,
    port: 3000
})
