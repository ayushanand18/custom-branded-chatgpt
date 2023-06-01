import '../styles/waiting.css'
import logo from '../assets/logo.svg';

export default function Waiting() {
    return (
        <div width="100vw">
            <img 
                src={logo} 
                className="appLogo" 
                width="100px" 
                style={{position: "absolute", left: "46%", top:"35%"}}
                alt="logo"/>
            
            <div className="gooey">
                <span className="dot"></span>
                <div className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <h4 style={{paddingTop: "20px", textAlign: "center"}}> loading ... </h4>
            </div>
        </div>
    )
}
