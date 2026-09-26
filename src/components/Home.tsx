import { useState, useEffect } from "react"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

type Movie = {
    id: number
    title: string
    poster_path: string | null
    vote_average: number
    overview: string
}
function Home() {
    const [roomCode, setRoomCode] = useState("")
    useEffect(() => {
        const savedRoomCode = localStorage.getItem("roomCode")
        if (savedRoomCode) {
            setRoomCode(savedRoomCode)
        }
    }, [])
  
    const [joinRoomCode, setJoinRoomCode] = useState("")
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [votedMovies, setVotedMovies] = useState<number[]>([])
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0)
    const [authReady, setAuthReady] = useState(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthReady(true)
        })
        return unsubscribe
    }, [])

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

    async function getMyVotes() {
        if (!roomCode) {
            alert("Join or create a room first")
            return
        }
        if (!auth.currentUser) {
            console.log("Firebase user not ready yet")
            return
        }

        const token = await auth.currentUser.getIdToken()

        const response = await fetch(
            `http://localhost:3000/api/rooms/${roomCode}/votes`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        )
        console.log("GET MY VOTES STATUS:", response.status)
        const data = await response.json()

        console.log("GET MY VOTES RESPONSE:", data)

        const movieIds = data.votes.map(
            (vote: { movieId: number }) => vote.movieId
        )
        setVotedMovies(movieIds)
    }

    useEffect(() => {
        console.log("ROOM CODE CHANGED:", roomCode)
        if (roomCode && authReady) {
            getMyVotes()
        }
    }, [roomCode, authReady])

    async function submitVote(movieId: number, vote:"like" | "pass") {
        console.log("ROOM CODE:", roomCode)
        if (!auth.currentUser) {
            alert("Not logged in")
            return
        }

        const token = await auth.currentUser.getIdToken()

        const response = await fetch(
            `http://localhost:3000/api/rooms/${roomCode}/votes`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    movieId,
                    vote
                })
            }
        )

        const data =  await response.json()

        console.log(data)

        setVotedMovies((previouse) => [...previouse, movieId])
    }
    // fetch needs to wait for the Hono response
    async function onCreateRoom() {
        const newRoomCode = generateRoomCode()
        setRoomCode(newRoomCode)
        // tells browser to rmb value under name roomCode
        localStorage.setItem("roomCode", newRoomCode)
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

        setRoomCode(joinRoomCode)
        localStorage.setItem("roomCode", joinRoomCode)

        alert("Joined room!")
    }

    const currentMovie = movies[currentMovieIndex]

    return(
        <div>
            <h1>Movie Night Matcher</h1>
            <button onClick={onCreateRoom}>Create a Room</button>
            <button onClick={onJoinRoom}>Join a Room</button>
            <button onClick={getMyVotes}>Get My Votes</button>
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
                    <p>Movie {currentMovieIndex + 1} of {movies.length}</p>

                    {currentMovie && (
                        <div key={currentMovie.id}
                            style={{
                                width: "250px",
                                margin: "20px",
                                padding: "15px",
                                border: "1px solid #ccc"
                            }}
                        >
                            <h2>{currentMovie.title}</h2>
                            <p>Rating: {currentMovie.vote_average.toFixed(1)}/10</p>
                            <img
                                src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
                                alt={currentMovie.title}
                                style={{
                                    width: "100%"
                                }}
                            />
                            <p>{currentMovie.overview}</p>
                            <div>
                                {votedMovies.includes(currentMovie.id) && (
                                    <p>You voted on this movie.</p>
                                )}

                                <button 
                                    onClick={() => submitVote(currentMovie.id, "like")}
                                    disabled={votedMovies.includes(currentMovie.id)}
                                >
                                    Like
                                </button>
                                <button 
                                    onClick={() => submitVote(currentMovie.id, "pass")}
                                    disabled={votedMovies.includes(currentMovie.id)}
                                >
                                    Pass
                                </button>
                                <button 
                                    onClick={() => setCurrentMovieIndex((previous) => previous - 1)}
                                    disabled={currentMovieIndex === 0}
                                >
                                    Previous
                                </button>
                                <button 
                                    onClick={() => setCurrentMovieIndex((previous) => previous + 1)}
                                    disabled={currentMovieIndex === movies.length - 1}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
        </div>
    )
}

export default Home