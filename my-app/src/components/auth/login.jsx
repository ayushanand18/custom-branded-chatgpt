import { React, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import logo from '../../assets/logo.svg';
import Chat from '../../components/chat.jsx';
import '../../styles/auth.css';

function Login() {
    const firebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
    };

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);    
    const [authState, setAuthState] = useState({
        isSignedIn: false,
        pending: true,
        user: null,
    })

    useEffect(() => {
        const unregisterAuthObserver = auth.onAuthStateChanged(user => 
            setAuthState({ user, pending: false, isSignedIn: !!user })
        )
        return () => unregisterAuthObserver()
    }, [])
    
    if(authState.pending) return <h1>working...</h1>
    else if(authState.isSignedIn) {
        navigate('/', { replace: true });
        return <Chat />
    }
    
    function handleEmailChange(event) {
        setEmail(event.target.value);
    }
    
    function handlePasswordChange(event) {
        setPassword(event.target.value);
    }

    async function handleLogin(event) {
        event.preventDefault();
        if(email==="" || password==="") {
            setErrorMessage("Incorrect email or password");
            setIsError(true);
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } 
        catch (err) {
            setErrorMessage("Incorrect email or password");
            setIsError(true);
            return;
        }
        navigate('/', { replace: true });
    }

    return (
        <div className="wrapper">
            <header className="header">
                <img src={logo} className="appLogo" alt="logo"/>
            </header>
            <main className="main">
                <section className="section">
                    <div className="sectionHeading">
                        Login to your account
                    </div>
                    <form onSubmit={handleLogin} className="loginForm" >
                        <div className="errorDialog" style={{display:isError?"block":"none"}}>
                            {errorMessage}
                        </div>

                        <div className="loginArea">
                            <input value={email} type="text" onChange={handleEmailChange} placeholder="Email address" />
                            <input value={password} type="password" onChange={handlePasswordChange} placeholder="Enter password" />
                        </div>
                        <div className="buttonGroup">
                            <button onClick={handleLogin} className="loginSubmit">Login</button>
                        </div>
                        <div className="signupLink">
                            Don't have an account?
                            &nbsp;
                            <Link to="/auth/signup">Sign up</Link>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    )
}

export default Login;