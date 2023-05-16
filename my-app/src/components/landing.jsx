import React from "react";
import '../styles/landing.module.css';

function LandingApp() {
    return (
        <div className="flexHome">
            <div className="flexMain">
                <div className="">
                    <Logo />
                </div>
                <div className="welcomeText">
                    Welcome to ChatGPT
                </div>
                <div className="welcomeBody">
                    Log in with your OpenAI account to continue
                </div>
                <div className="buttonSet">
                    <button className="loginButton">Log in</button>
                    <button className="signupButton">Sign up</button>
                </div>
            </div>
        </div>
    )
}

export default LandingApp;