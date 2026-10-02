type Message = {
    uid: string
    email: string
    text: string
    createdAt: number
}

type ChatProps = {
    messages: Message[]
    chatMessage: string
    setChatMessage: (message: string) => void
    sendChatMessages: () => void
}

function Chat({
    messages,
    chatMessage,
    setChatMessage,
    sendChatMessages
}: ChatProps) {
    return (
        <div>
            <h2>Chat</h2>
            <div>
                {messages.map((message, index) => (
                    <p key={index}>
                        <strong>{message.email}:</strong> {message.text}
                    </p>
                ))}
            </div>

            <input 
                type="text" 
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Type a message..."
            />
            <button onClick={sendChatMessages}>
                Send
            </button>
        </div>
    )
}
export default Chat