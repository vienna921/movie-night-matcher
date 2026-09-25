import { useState } from "react"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { firestore, auth } from "../firebase"

function Home() {
    const [roomCode, setRoomCode] = useState("")
    const [joinRoomCode, setJoinRoomCode] = useState("")

    function generateRoomCode() {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let code = ""
        let i = 0
        while (i < 6) {
            code += characters[Math.floor(Math.random() * characters.length)]
            i++
        }
        return code
    }
    // fetch needs to wait for the Hono response
    async function onCreateRoom() {
        const newRoomCode = generateRoomCode()
        setRoomCode(newRoomCode)
        if (!auth.currentUser) {
            alert("Not Logged in")
            return
        }
        const user = auth.currentUser
        const token = await user.getIdToken()
        // where and how to send request
        const response = await fetch("http://localhost:3000/api/rooms", {
            method: "POST",
            // tell Hono what format we're sending (JSON)
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            // put the data in the request body
            body: JSON.stringify({
                roomCode: newRoomCode
            })
        })
        console.log("Create room response:", response.status)

    }

    async function onJoinRoom() {
        if (!auth.currentUser) {
            alert("Not Logged in")
            return
        }
        const user = auth.currentUser
        const token = await user.getIdToken()
        
        const response = await fetch("http://localhost:3000/api/rooms/join", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                roomCode: joinRoomCode
            })
        })
        const data = await response.json()

        if(!response.ok) {
            alert(data.error)
            return
        }

        alert("Joined room!")
    }
    
    return(
        <div>
            <h1>Movie Night Matcher</h1>
            <button onClick={onCreateRoom}>Create a Room</button>
            <button onClick={onJoinRoom}>Join a Room</button>
            <input 
                value={joinRoomCode}
                onChange={(event) => setJoinRoomCode(event.target.value)}
                placeholder="Enter room code"
            />

            {roomCode && 
                <p>Your room code is: {roomCode}</p>
            }
        </div>
    )
}

export default Home