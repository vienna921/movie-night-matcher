type Movie = {
    id: number
    title: string
    poster_path: string | null
    vote_average: number
    overview: string
    genre_ids: number[]
}

type Vote = {
    userId: string
    movieId: number
    vote: "like" | "pass"
    round: number
}

type MatchResultsProps = {
    matchMovies: Movie[]
    matchTier: string
    liveVotes: Vote[]
    totalMembers: number
    votingRound: number
    setCurrentMovieIndex: (index: number) => void
    setVotedMovies: (movies: number[]) => void
    roomCode: string
}

function MatchResults({
    matchMovies,
    matchTier,
    liveVotes,
    totalMembers,
    votingRound,
    setCurrentMovieIndex,
    setVotedMovies,
    roomCode
} : MatchResultsProps) {
    async function voteAgain() {
        setCurrentMovieIndex(0)
        setVotedMovies([])
        
        await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms//${roomCode}/next-round`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    movieIds: matchMovies.map((movie) => movie.id)
                })
            }
        )
    }

    return (
        <section>
            <h2>Matches</h2>
            {
                matchMovies.length > 0 ? (
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
                                    <p>
                                        {movie.title} - {likes}/{totalMembers}
                                    </p>
                                </div>
                            )
                        })}
                        {matchMovies.length > 1 && (
                            <button onClick={voteAgain}>
                                Vote Again
                            </button>
                        )}
                    </>
                ) : (
                    <p>No movies reached a majority.</p>
                )}
        </section>
    )
}
export default MatchResults