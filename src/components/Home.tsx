import { useState, useEffect } from "react"
import { auth, firestore } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, onSnapshot } from "firebase/firestore"
import Chat from "./Chat"
import RoomHeader from "./RoomHeader"
import MovieCard from "./MovieCard"
import MatchResults from "./MatchResults"
import {
    genres,
    filterMovies,
    getMatchMovies,
    getMovieVotes
} from "../utils/movieUtils"
import type { Movie } from "../utils/movieUtils"

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
        uid: string; email: string; lastSeen: number
    }[]
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
    const [chatMessage, setChatMessage] = useState("")
    const [messages, setMessages] = useState<
        {
            uid: string
            email: string
            text: string
            createdAt: number
        }[]
    >([])
    const [isMovieHovered, setIsMovieHovered] = useState(false)

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
                `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/heartbeat`,
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
        if (!roomCode) return
        const messagesRef = collection(
            firestore,
            "rooms",
            roomCode,
            "messages"
        )
        const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
            const newMessages = snapshot.docs
                .map((doc) => doc.data() as {
                    uid: string
                    email: string
                    text: string
                    createdAt: number
                })
                .sort((a, b) => a.createdAt - b.createdAt)

            setMessages(newMessages)
        })
        return () => unsubscribe()
    }, [roomCode])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthReady(true)
        })
        return unsubscribe
    }, [])

    async function copyRoomCode() {
        await navigator.clipboard.writeText(roomCode)
    }
    async function getMovies() {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/movies`)
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
            `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/votes`,
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

    async function submitVote(movieId: number, vote: "like" | "pass") {
        if (!auth.currentUser) {
            alert("Not logged in")
            return
        }

        const token = await auth.currentUser.getIdToken()

        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/votes`,
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

        const data = await response.json()

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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
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

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/join`, {
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

        if (!response.ok) {
            console.log("STATUS:", response.status)
            console.log("DATA:", data)
            alert(JSON.stringify(data))
            return
        }

        setRoomCode(joinRoomCode)
        localStorage.setItem("roomCode", joinRoomCode)

        alert("Joined room!")
    }

    async function sendChatMessages() {
        if (!chatMessage.trim() || !auth.currentUser || !roomCode) {
            return
        }
        const token = await auth.currentUser.getIdToken()
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: chatMessage
                })
            }
        )
        const data = await response.json()
        if (!response.ok) {
            alert(data.error)
            return
        }
        setChatMessage("")
    }

    const filteredMovies = filterMovies(
        movies,
        searchTerm,
        selectedGenre
    )
    const totalMembers = members.length
    const { matchMovies, matchTier } = getMatchMovies(
        movies,
        liveVotes,
        totalMembers,
        votingRound
    )

    const moviesToVoteOn =
        votingRound === 1
            ? filteredMovies
            : movies.filter((movie) => roundMovieIds.includes(movie.id))
    const currentMovie = moviesToVoteOn[currentMovieIndex]

    const { likeCount, passCount } = getMovieVotes(
        liveVotes,
        currentMovie?.id,
        votingRound
    )

    return (
        <div
            style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "15px"
            }}
        >
            <h1
                style={{
                    textAlign: "center",
                    fontSize: "42px",
                    marginBottom: "10px"
                }}
            >
                Movie Night Matcher
            </h1>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "20px"
                }}
            >
                <button onClick={onCreateRoom}>Create a Room</button>
                <input
                    value={joinRoomCode}
                    onChange={(event) => setJoinRoomCode(event.target.value)}
                    placeholder="Enter room code"
                    style={{
                        width: "180px",
                        padding: "8px"
                    }}
                />
                <button onClick={onJoinRoom}>Join a Room</button>
            </div>
            {roomCode && (
                <RoomHeader
                    roomCode={roomCode}
                    email={auth.currentUser?.email}
                    copyRoomCode={copyRoomCode}
                />
            )}

            <div
                style={{
                    padding: "15px",
                    marginBottom: "20px",
                    border: "1px solid #ddd",
                    borderRadius: "10px"
                }}
            >
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
            </div>

            {loading ? (
                <p>Loading movies...</p>
            ) : error ? (
                <p
                    style={{
                        textAlign: "center",
                        padding: "10px",
                        margin: "10px 0",
                        border: "1px solid #f5c2c7",
                        borderRadius: "8px"
                    }}
                >
                    {error}
                </p>
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

                    <MatchResults
                        matchMovies={matchMovies}
                        matchTier={matchTier}
                        liveVotes={liveVotes}
                        totalMembers={totalMembers}
                        votingRound={votingRound}
                        setCurrentMovieIndex={setCurrentMovieIndex}
                        setVotedMovies={setVotedMovies}
                        roomCode={roomCode}
                    />

                    <Chat
                        messages={messages}
                        chatMessage={chatMessage}
                        setChatMessage={setChatMessage}
                        sendChatMessages={sendChatMessages}
                    />

                    <p>Movie {currentMovieIndex + 1} of {moviesToVoteOn.length}</p>

                    {currentMovie ? (

                        <MovieCard
                            movie={currentMovie}
                            isHovered={isMovieHovered}
                            setIsHovered={setIsMovieHovered}
                            likeCount={likeCount}
                            passCount={passCount}
                            hasVoted={votedMovies.includes(currentMovie.id)}
                            submitVote={submitVote}
                            currentMovieIndex={currentMovieIndex}
                            moviesToVoteOnLength={moviesToVoteOn.length}
                            setCurrentMovieIndex={setCurrentMovieIndex}
                        />
                    ) : (
                        <p>No movies found.</p>
                    )}
                </div>
            )}

        </div>
    )
}

export default Home