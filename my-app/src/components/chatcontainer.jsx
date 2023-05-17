import React from "react";
import '../styles/chat.css';

function ChatContainer(){
    return (
        <div className="containerWrapper">
            <div className="chatList">
                Chat List
            </div>
            <div className="wrapperArea">
                <div className="textArea">
                    <textarea className="promptArea" placeholder="Send a message."></textarea>
                    <button className="sendButton">
                        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatContainer;