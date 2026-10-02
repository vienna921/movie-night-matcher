import type React from "react"

type Movie = {
    id: number
    title: string
    poster_path: string | null
    vote_average: number
    overview: string
    genre_ids: number[]
}

type MovieCardProps = {
    movie: Movie
    isHovered: boolean
    setIsHovered: (hovered: boolean) => void
    likeCount: number
    passCount: number
    hasVoted: boolean
    submitVote: (movieId: number, vote: "like" | "pass") => void
    currentMovieIndex: number
    moviesToVoteOnLength: number
    setCurrentMovieIndex: React.Dispatch<React.SetStateAction<number>>
}

function MovieCard({
    movie,
    isHovered,
    setIsHovered,
    likeCount,
    passCount,
    hasVoted,
    submitVote,
    currentMovieIndex,
    moviesToVoteOnLength,
    setCurrentMovieIndex
}: MovieCardProps) {
    return(
        <div
            key={movie.id}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: "300px",
                maxWidth: "300px",
                margin: "20px auto",
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                boxShadow: isHovered
                    ? "0 8px 20px rgba(0, 0, 0, 0.18)"
                    : "0 4px 12px rgba(0, 0, 0, 0.1)",
                backgroundColor: "white",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                transform: isHovered ? "translateY(-5px)" : "translateY(0)"
            }}
        >
            <h2
                style={{
                    textAlign: "center",
                    marginTop: "10px",
                    marginBottom: "10px"
                }}
            >
                {movie.title}
            </h2>

            <p
                style={{
                    textAlign: "center",
                    margin: "5px 0",
                    fontSize: "14px"
                }}
            >
                Rating: {movie.vote_average.toFixed(1)}/10
            </p>
            <img 
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                alt={movie.title}
                style={{
                    width: "100%",
                    height: "auto",
                    marginBottom: "15px"
                }}
            />
            <div
                style={{
                    marginTop: "15px",
                    marginBottom: "15px"
                }}
            >
                <p
                    style={{
                        lineHeight: "1.3",
                        margin: 0,
                        width: "100%",
                        textAlign: "center"
                    }}
                >
                    {movie.overview}
                </p>
            </div>
            <p>✓{likeCount} ✗{passCount}</p>
            <div>
                {hasVoted && (
                    <p>You voted on this movie.</p>
                )}
                <button
                    onClick={() => submitVote(movie.id, "like")}
                >
                    {hasVoted ? "Change to Like" : "Like"}
                </button>
                <button
                    onClick={() => submitVote(movie.id, "pass")}
                >
                    {hasVoted ? "Change to Pass" : "Pass"}
                </button>
                <button
                    onClick={() =>
                        setCurrentMovieIndex((previous) => previous - 1)
                    }
                    disabled={currentMovieIndex === 0}
                >
                    Previous
                </button>

                <button
                    onClick={() => 
                        setCurrentMovieIndex((previous) => previous + 1)
                    }
                    disabled={
                        currentMovieIndex === moviesToVoteOnLength - 1
                    }
                >
                    Next
                </button>
            </div>
        </div>
    )
}

export default MovieCard