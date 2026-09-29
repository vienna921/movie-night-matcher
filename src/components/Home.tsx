import { useState, useEffect } from "react"
import { auth, firestore } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, onSnapshot } from "firebase/firestore"

type Movie = {
    id: number
    title: string
    poster_path: string | null
    vote_average: number
    overview: string
    genre_ids: number[]
}

const genres = [
    { id: 28, name: "Action" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
    { id: 27, name: "Horror" },
    { id: 878, name: "Science Fiction" },
    { id: 10749, name: "Romance" },
]
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
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
    const [members, setMembers] = useState<{
        uid: string; email: string; lastSeen: number }[]
    >([])
    const [liveVotes, setLiveVotes] = useState<
        { 
            userId: string
            movieId: number
            vote: "like" | "pass" 
            round: number
        }[]
    >([])
    const [votingRound, setVotingRound] = useState(1)
    const [roundMovieIds, setRoundMovieIds] = useState<number[]>([])    
    
    useEffect(() => {
        if (!roomCode || !authReady) {
            return
        }
        const sendHeartbeat = async () => {
            if (!auth.currentUser) {
                return
            }
            const token = await auth.currentUser.getIdToken()
            await fetch(
                `http://localhost:3000/api/rooms/${roomCode}/heartbeat`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
        }
        sendHeartbeat()

        const interval = setInterval(sendHeartbeat, 10000)
        return () => clearInterval(interval)
    }, [roomCode, authReady])
    useEffect(() => {
        if (!roomCode) {
            return
        }

        const votesRef = collection(
            firestore,
            "rooms",
            roomCode,
            "votes"
        )

        const unsubscribe = onSnapshot(votesRef, (snapshot) => {
            const votes = snapshot.docs.map((doc) => doc.data()) as {
                userId: string
                movieId: number
                vote: "like" | "pass"
                round: number
            }[]
            setLiveVotes(votes)

        })
        return unsubscribe
    }, [roomCode])

    useEffect(() => {
        if (!roomCode) {
            return
        }

        const roomRef = doc(firestore, "rooms", roomCode)
        
        // whenever this Firestore document changes,
        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data()
                setMembers(data.members || [])
                setRoundMovieIds(data.roundMovieIds || [])
                setVotingRound((previousRound) => {
                    const newRound = data.votingRound || 1

                    if (newRound !== previousRound) {
                        setCurrentMovieIndex(0)
                        setVotedMovies([])
                    }
                    return newRound
                })
            }
        })
        return unsubscribe
    }, [roomCode])

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
        const data = await response.json()

        const movieIds = data.votes
            .filter((vote: { round: number }) => vote.round === votingRound)
            .map((vote: { movieId: number }) => vote.movieId)
        setVotedMovies(movieIds)
    }

    useEffect(() => {
        if (roomCode && authReady) {
            getMyVotes()
        }
    }, [roomCode, authReady])

    async function submitVote(movieId: number, vote:"like" | "pass") {
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
                    vote,
                    round: votingRound
                })
            }
        )

        const data =  await response.json()

        setVotedMovies((previous) => [...previous, movieId])
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

    const filteredMovies = movies.filter((movie) => {        
        const matchesSearch = movie.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        const matchesGenre = 
            selectedGenre === null || 
            movie.genre_ids.includes(selectedGenre)
        
        return matchesSearch && matchesGenre
    })    

    const totalMembers = members.length
    const everyoneMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) => 
                vote.movieId === movie.id &&
                vote.vote === "like" &&
                vote.round === 1
        ).length
        return totalMembers > 0 && likes === totalMembers
    })
    const strongMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) =>
                vote.movieId === movie.id &&
                vote.vote === "like" &&
                vote.round === 1
        ).length

        return (
            totalMembers > 0 &&
            likes / totalMembers >= 0.75 &&
            likes < totalMembers
        )
    })
    const majorityMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) =>
                vote.movieId === movie.id &&
                vote.vote === "like" && 
                vote.round === 1
        ).length

        return (
            totalMembers > 0 &&
            likes / totalMembers >= 0.5 &&
            likes / totalMembers < 0.75
        )
    })

    let roundOneMatches = everyoneMatches
    let matchTier = "Everyone agrees"

    if (roundOneMatches.length === 0) {
        roundOneMatches = strongMatches
        matchTier = "Strong matches"
    }

    if (roundOneMatches.length === 0) {
        roundOneMatches = majorityMatches
        matchTier = "Majority matches"
    }


    const currentEveryoneMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) => 
                vote.movieId === movie.id &&
            vote.vote === "like" &&
            vote.round === votingRound
        ).length

        return totalMembers > 0 && likes === totalMembers
    })

    const currentStrongMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) => 
                vote.movieId === movie.id &&
            vote.vote === "like" &&
            vote.round === votingRound
        ).length

        return (
            totalMembers > 0 &&
            likes / totalMembers >= 0.75 &&
            likes < totalMembers
        )
    })

    const currentMajorityMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) => 
                vote.movieId === movie.id &&
            vote.vote === "like" &&
            vote.round === votingRound
        ).length

        return (
            totalMembers > 0 &&
            likes / totalMembers >= 0.5 &&
            likes / totalMembers < 0.75
        )
    })

    const matchMovies =
        votingRound === 1
            ? roundOneMatches
            : currentEveryoneMatches.length > 0
                ? currentEveryoneMatches
                : currentStrongMatches.length > 0
                    ? currentStrongMatches
                    : currentMajorityMatches


    const moviesToVoteOn = 
        votingRound === 1
            ? filteredMovies
            : movies.filter((movie) => roundMovieIds.includes(movie.id))

    const currentMovie = moviesToVoteOn[currentMovieIndex]

    const currentMovieVotes = liveVotes.filter(
        (vote) => 
            vote.movieId === currentMovie?.id &&
            vote.round === votingRound
    )

    const likeCount = currentMovieVotes.filter(
        (vote) => vote.vote === "like"
    ).length

    const passCount = currentMovieVotes.filter(
        (vote) => vote.vote === "pass"
    ).length

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
            <h2>Room: {roomCode}</h2>
            <p>
                You are: {auth.currentUser?.email}
            </p>
            <h3>Members</h3>
            <ul>
                {members.map((member) => {
                    const isActive = Date.now() - member.lastSeen < 20000
                    return (
                        <li key={member.uid}>
                            {isActive ? "🟢" : "⚪"} {member.email}
                        </li>
                    )
                })}
            </ul>
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
                    <input 
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value)
                            setCurrentMovieIndex(0)
                        }}
                        placeholder="Search movies"
                    />
                    <div>
                        <button onClick={() => {
                            setSelectedGenre(null)
                            setCurrentMovieIndex(0)
                        }}>
                            All
                        </button>

                        {genres.map((genre) => (
                            <button
                                key={genre.id}
                                onClick={() => {
                                    setSelectedGenre(genre.id)
                                    setCurrentMovieIndex(0)
                                }}
                            >
                                {genre.name}
                            </button>
                        ))}
                    </div>
                    
                    <section>
                        <h2>Matches</h2>
                        {matchMovies.length > 0 ? (
                            <>
                                <h3>{matchTier}</h3>
                                {matchMovies.map((movie) => {
                                    const likes = liveVotes.filter(
                                        (vote) =>
                                            vote.movieId === movie.id &&
                                            vote.vote === "like" &&
                                            vote.round === votingRound
                                    ).length
                                    return (
                                        <div key={movie.id}>
                                            <p>{movie.title} - {likes}/{totalMembers}</p>
                                        </div>
                                    )
                                })}
                                {matchMovies.length > 1 && (
                                        <button onClick={async () => {
                                            setCurrentMovieIndex(0)
                                            setVotedMovies([])
                                            await fetch(`http://localhost:3000/api/rooms/${roomCode}/next-round`, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json"
                                                },
                                                body: JSON.stringify({
                                                    movieIds: matchMovies.map((movie) => movie.id)
                                                })
                                            })
                                        }}>
                                            Vote Again
                                        </button>
                                    )}
                            </>
                        ) : (
                            <p>No movies reached a majority.</p>
                        )}
                    </section>

                    <p>Movie {currentMovieIndex + 1} of {moviesToVoteOn.length}</p>

                    {currentMovie ? (
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
                            <p>✓{likeCount} ✗{passCount}</p>
                            <div>
                                {votedMovies.includes(currentMovie.id) && (
                                    <p>You voted on this movie.</p>
                                )}

                                <button onClick={() => submitVote(currentMovie.id, "like")}                                >
                                    {votedMovies.includes(currentMovie.id) ? "Change to Like" : "Like"}
                                </button>
                                <button onClick={() => submitVote(currentMovie.id, "pass")}                                >
                                    {votedMovies.includes(currentMovie.id) ? "Change to Pass" : "Pass"}
                                </button>
                                <button 
                                    onClick={() => setCurrentMovieIndex((previous) => previous - 1)}
                                    disabled={currentMovieIndex === 0}
                                >
                                    Previous
                                </button>
                                <button 
                                    onClick={() => setCurrentMovieIndex((previous) => previous + 1)}
                                    disabled={currentMovieIndex === moviesToVoteOn.length - 1}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p>No movies found.</p>
                    )}
                </div>
            )}
            
        </div>
    )
}

export default Home