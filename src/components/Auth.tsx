import { useState, useEffect } from "react"
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth"
import { auth } from "../firebase"

function Auth() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    // when component appears, start listening to Firebase login changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoggedIn(true)
                console.log("Logged in user:", user.uid)
            } else {
                setIsLoggedIn(false)
            }
        })
        return unsubscribe
    }, [])

    async function onSignUp() {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            )
            console.log("User ID:", userCredential.user.uid)

        } catch (error) {
            console.error(error)
            alert("Sign up failed")
        }
    }

    async function onLogin() {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            )

            console.log("User ID:", userCredential.user.uid)
        } catch (error) {
            console.error(error)
            alert("Login failed")
        }
    }

    async function onLogout() {
        await signOut(auth)
    }

    return (
        <div>
            {!isLoggedIn ? (
                <>
                    <h2>Account</h2>
                    <input 
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)} 
                    />
                    <input 
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)} 
                    />

                    <button onClick={onSignUp}>
                        Sign Up
                    </button>
                    <button onClick={onLogin}>
                        Log In
                    </button>
                </>
            ) : (
                <>
                    <p>Logged in!</p>
                    <button onClick={onLogout}>
                        Log Out
                    </button>
                </>
            )}
        </div>
    )
}

export default Auth