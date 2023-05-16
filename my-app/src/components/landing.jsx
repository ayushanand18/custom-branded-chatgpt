import React from "react";
import '../styles/landing.css';
import Logo from '../assets/logo.svg';

function LandingApp() {
    return (
        <div className="flexHome">
            <div className="flexMain">
                <div className="logoContainer">
                    <img src={Logo} className="appLogo" alt="logo" />
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
            <div className="footer">
                <a href="#terms-of-use" target="_blank" rel="noreferrer">Terms of use</a>
                <span className="text-gray-600">|</span>
                <a href="#privacy-policy" target="_blank" rel="noreferrer">Privacy policy</a>
            </div>
        </div>
    )
}

export default LandingApp;