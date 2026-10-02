export type Movie = {
    id: number
    title: string
    poster_path: string | null
    vote_average: number
    overview: string
    genre_ids: number[]
}

export type Vote = {
    userId: string
    movieId: number
    vote: "like" | "pass"
    round: number
}

export const genres = [
    { id: 28, name: "Action" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
    { id: 27, name: "Horror" },
    { id: 878, name: "Science Fiction" },
    { id: 10749, name: "Romance" },
]

export function filterMovies(
    movies: Movie[],
    searchTerm: string,
    selectedGenre: number | null
) {
    return movies.filter((movie) => {        
        const matchesSearch = movie.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        const matchesGenre = 
            selectedGenre === null || 
            movie.genre_ids.includes(selectedGenre)
        
        return matchesSearch && matchesGenre
    }) 
}

export function getMatchMovies(
    movies: Movie[],
    liveVotes: Vote[],
    totalMembers: number,
    votingRound: number
) {
    const everyoneMatches = movies.filter((movie) => {
        const likes = liveVotes.filter(
            (vote) => 
                vote.movieId === movie.id &&
                vote.vote === "like" &&
                vote.round === votingRound
        ).length
        return totalMembers > 0 && likes === totalMembers
    })
    const strongMatches = movies.filter((movie) => {
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
    const majorityMatches = movies.filter((movie) => {
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

    let matchMovies = everyoneMatches
    let matchTier = "Everyone agrees"

    if (matchMovies.length === 0) {
        matchMovies = strongMatches
        matchTier = "Strong matches"
    }

    if (matchMovies.length === 0) {
        matchMovies = majorityMatches
        matchTier = "Majority matches"
    }

    return {
        matchMovies,
        matchTier
    }

}

export function getMovieVotes(
    liveVotes: Vote[],
    movieId: number | undefined,
    votingRound: number
) {
    const movieVotes = liveVotes.filter(
        (vote) =>
            vote.movieId === movieId &&
            vote.round === votingRound
    )

    return {
        likeCount: movieVotes.filter(
            (vote) => vote.vote === "like"
        ).length,

        passCount: movieVotes.filter(
            (vote) => vote.vote === "pass"
        ).length
    }
}