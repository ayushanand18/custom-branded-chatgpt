import React from "react";
import '../styles/chat.css';

function Chat(){
    const [chats, setChats] = useState({"1":"first chat"})
    const [pinnedChats, setPinnedChats] = useState(["1"])
    const [folders, setFolders] = useState([
        {"name":"folder1", "chats":["1"]}
    ])

    const pinnedChatsContainer = pinnedChats.map((index, chat_id)=>{
        <span>
            <svg key={index} stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 
            <li key={chat_id}> {chats[chat_id]} </li>
        </span>
    })
    
    const foldersContainer = folders.map((index, folder_id) => {
        <span>
            <svg key={index} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128" width="256" height="256"><path stroke="#000" stroke-linecap="round" stroke-width="6" d="M26 45.5C26 35.835 33.835 28 43.5 28V28L55.3399 28C58.7317 28 61.7549 30.1389 62.8838 33.3374L65.1727 39.8226C66.2737 42.9422 69.1813 45.0623 72.4881 45.1568L84.5 45.5V45.5C94.0831 45.2262 102 52.9202 102 62.5071L102 74.5V80C102 90.4934 93.4934 99 83 99V99L64 99L45 99V99C34.5066 99 26 90.4934 26 80L26 66L26 45.5Z" class="colorStroke000 svgStroke"></path></svg>
            <li key={folder_id}>{folders[folder_id]}</li>
        </span>
    })

    return (
        <div className="wrapper">
            <div className="overlay"></div>
            <div className="container">
                <div className="navSection">
                    <div className="flexDiv">
                        <div className="navMenu">
                            <div className="newChatButton">
                                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                New chat
                            </div>
                            <div className="stickyLabel">
                                <div className="labelHeading">
                                    Pinned chats
                                </div>
                            </div>

                            <div className="pinnedChats">
                                <ol>
                                    {pinnedChatsContainer}
                                </ol>
                            </div>
                            <div className="stickyLabel">
                                <div className="labelHeading">
                                    Folders
                                </div>
                            </div>
                            <div className="folders">
                                <ol>
                                    {foldersContainer}
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="chatContainer">
                    Chat Container
                </div>
            </div>
        </div>
    )
}

export default Chat;