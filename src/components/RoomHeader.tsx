type RoomHeaderProps = {
    roomCode: string
    email: string | null | undefined
    copyRoomCode: () => void
}

function RoomHeader({
    roomCode,
    email,
    copyRoomCode
}: RoomHeaderProps) {
    return (
        <div
            style={{
                padding: "15px",
                marginBottom: "20px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                textAlign: "center",
                backgroundColor: "#f8f9fa"
            }}
        >
            <h2
                style={{
                    marginBottom: "5px"
                }}
            >
                Room: <span style={{ letterSpacing: "3px" }}>{roomCode}</span>
            </h2>
            <button onClick={copyRoomCode}>
                Copy Room Code
            </button>
            
            <p>
                You are: {email}
            </p>
        </div>
    )
}
export default RoomHeader