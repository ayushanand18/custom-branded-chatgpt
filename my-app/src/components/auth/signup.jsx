import { React, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getAuth,createUserWithEmailAndPassword } from "firebase/auth";
import logo from '../../assets/logo.svg';
import '../../styles/auth.css';

function Signup() {
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

    document.title = "Signup to ChatGPT"

    if(authState.pending) return <h1>working...</h1>
    else if(authState.isSignedIn) {
        navigate('/', { replace: true });
    }

    function handleEmailChange(event) {
        setEmail(event.target.value);
    }

    function handlePasswordChange(event) {
        setPassword(event.target.value);
    }

    async function handleRegister(event) {
        event.preventDefault();
        if(email==="" || password==="") {
            setErrorMessage("Email or password must be non-null");
            setIsError(true);
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } 
        catch (err) {
            setErrorMessage("Unable to create account.");
            setIsError(true);
            return;
        }
        navigate('/', { replace: true });
    }

    return (
        <div className="wrapper">
            <header className="header">
                <Link to="/">
                    <img src={logo} className="appLogo" alt="logo"/>
                </Link>
            </header>
            <main className="main">
                <section className="section">
                    <div className="sectionHeading">
                        Create new account
                    </div>
                    <form onSubmit={handleRegister} className="loginForm" >
                        <div className="errorDialog" style={{display:isError?"block":"none"}}>
                            {errorMessage}
                        </div>

                        <div className="loginArea">
                            <input value={email} type="text" onChange={handleEmailChange} placeholder="Email address" />
                            <input value={password} type="password" onChange={handlePasswordChange} placeholder="Enter password" />
                        </div>
                        <div className="buttonGroup">
                            <button onClick={handleRegister} className="loginSubmit">Login</button>
                        </div>
                        <div className="signupLink">
                            Already have an account?
                            &nbsp;
                            <Link to="/auth/login">Login</Link>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    )
}

export default Signup;