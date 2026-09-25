import { useState, useEffect } from "react"
import { auth } from "../firebase"

type Movie = {
    id: number
    title: string
    poster_path: string | null
    vote_average: number
    overview: string
}
function Home() {
    const [roomCode, setRoomCode] = useState("")
    const [joinRoomCode, setJoinRoomCode] = useState("")
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    async function getMovies() {
        try {
            const response = await fetch("http://localhost:3000/api/movies")
            // check to see if server returned an error
            if (!response.ok) {
                throw new Error("Failed to fetch movies")
            }
            const data = await response.json()
            setMovies(data.results)
        } catch (error) {
            setError("Failed to load movies")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        getMovies()
    }, [])

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

            {loading ? (
                <p>Loading movies...</p>
            ) : error ? (
                <p>{error}</p>
            ) : (
                <div
                    style={{
                        // put cards next to each other
                        display: "flex",
                        // move to next row if not enough room
                        flexWrap: "wrap"
                    }}
                >
                    {movies.map((movie) => (
                        <div key={movie.id}
                            style={{
                                width: "250px",
                                margin: "20px",
                                padding: "15px",
                                border: "1px solid #ccc"
                            }}
                        >
                            <h2>{movie.title}</h2>
                            <p>Rating: {movie.vote_average.toFixed(1)}/10</p>
                            <img
                                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                alt={movie.title}
                                style={{
                                    width: "100%"
                                }}
                            />
                            <p>{movie.overview}</p>
                            
                        </div>
                    ))}
                </div>
            )}
            
        </div>
    )
}

export default Home