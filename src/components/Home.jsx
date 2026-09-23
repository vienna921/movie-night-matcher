import { useState } from "react"
import { doc, setDoc } from "firebase/firestore"
import { firestore } from "../firebase"

function Home() {
    const [roomCode, setRoomCode] = useState("")

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
    // Firestore needs time to save room so wait till finish
    async function onCreateRoom() {
        const newRoomCode = generateRoomCode()
        setRoomCode(newRoomCode)
        const roomRef = doc(firestore, "rooms", newRoomCode)

        await setDoc(roomRef, {
            creator : "temporary-user",
            members: [],
            votes: []
        })
    }

    function onJoinRoom() {
        console.log("Join Room clicked")
    }
    
    return(
        <div>
            <h1>Movie Night Matcher</h1>
            <button onClick={onCreateRoom}>Create a Room</button>
            <button onClick={onJoinRoom}>Join a Room</button>
            {roomCode && 
                <p>Your room code is: {roomCode}</p>
            }
        </div>
    )
}

export default Home