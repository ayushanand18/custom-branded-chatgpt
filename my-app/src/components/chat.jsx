import {React, useState} from "react";
import ChatContainer from './chatcontainer';
import '../styles/chat.css';

function Chat(){
    const [chats, setChats] = useState({"c_1":"first chat"})
    const [pinnedChats, setPinnedChats] = useState(["c_1"])
    const [folders, setFolders] = useState([
        {"name":"folder1", "chats":["c_1"], "id":"f_1"},
    ])
    const [userInfo, setUserInfo] = useState({"name":"Ayush Anand"});
    const [dialogVisibility, setDialogVisbility] = useState(false);
    const [quickContextVisibility, setQuickContextVisibility] = useState(false);

    function handleOpenDialog() {
        const newVisibility = dialogVisibility^true;
        setDialogVisbility(newVisibility);
    }

    function handleOpenContext() {
        const newVisibility = quickContextVisibility^true;
        setQuickContextVisibility(newVisibility);
    }

    const pinnedChatsContainer = pinnedChats?.map((chat_id)=>{
        return (
            <li key={chat_id+"li"} className="listItem"> 
                <svg key={chat_id}
                    stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg> 
                <span key={chat_id}>
                    {chats[chat_id]}
                </span>
            </li>
        )
    })
    
    const foldersContainer = folders?.map((folderInfo, index) => {
        return (
        <details>
            <summary>
                <li key={folderInfo.id+"li"} className="listItem">
                    <svg key={folderInfo.id} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128" width="36" height="36">
                        <path stroke="#fff" strokeLinecap="round" strokeWidth="6" d="M26 45.5C26 35.835 33.835 28 43.5 28V28L55.3399 28C58.7317 28 61.7549 30.1389 62.8838 33.3374L65.1727 39.8226C66.2737 42.9422 69.1813 45.0623 72.4881 45.1568L84.5 45.5V45.5C94.0831 45.2262 102 52.9202 102 62.5071L102 74.5V80C102 90.4934 93.4934 99 83 99V99L64 99L45 99V99C34.5066 99 26 90.4934 26 80L26 66L26 45.5Z" ></path>
                    </svg>
                    {folderInfo.name}
                </li>
            </summary>
            <p key={folderInfo.id+"p"} className="openFolderChats">
                <ul key={folderInfo.id+"ul"}>{
                    folderInfo.chats?.map((chat_id) => {
                        return (<li key={chat_id}>{chats[chat_id]}</li>)
                    })
                }</ul>
            </p>
        </details>
        )
    })

    return (
        <div className="wrapper">
            <div className="overlay"></div>
            <div className="container">
                <div class="stickyTopbar">
                    <button type="button" class="inlineFlex">
                        <span class="sr-only">Open sidebar</span>
                        <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <h1 class="flexTextNormal">ChatGPT</h1>
                    <button type="button" class="px-3">
                        <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
                <div className="navSection">
                    <div className="flexDiv">
                        <div className="navMenu">
                            <div className="newChatButton">
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                    <div className="absolute" style={{display: quickContextVisibility?"inline":"none", bottom:"0rem", marginBottom:"7.2rem"}}>
                        <nav role="none" className="shortDialog" >
                            <a as="a" href="#faq" target="_blank" className="py-3 transitionColors" id="headlessui-menu-item-:r2u:" role="menuitem" tabindex="-1" >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                Save Context
                            </a>
                            <span href="#" as="button" class="py-3 transitionColors gap-3" id="headlessui-menu-item-:r30:" role="menuitem" tabindex="-1" >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                Know About Us
                            </span>
                        </nav>
                    </div>

                    <div className="border-t">
                        <span className="py-3">
                            <span className="w-full" onClick={handleOpenContext}>
                                <span className="gold-new-button">
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    Quick Actions
                                </span>
                                <span className="rounded-md">NEW</span>
                            </span>
                        </span>

                        <div className="absolute" style={{bottom: dialogVisibility?"0%":"100%"}}>
                            <nav role="none" className="shortDialog" >
                                <a as="a" href="#faq" target="_blank" className="py-3 transitionColors" id="headlessui-menu-item-:r2u:" role="menuitem" tabindex="-1" >
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Help &amp; FAQ
                                </a>
                                <span href="#" as="button" class="py-3 transitionColors" id="headlessui-menu-item-:r30:" role="menuitem" tabindex="-1" >
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    Settings
                                </span>
                                <span href="#" as="button" className="py-3 transitionColors gap-3" role="menuitem" tabindex="-1" >
                                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Log out
                                </span>
                            </nav>
                        </div>

                        <div class="groupRelative py-3">
                            <button className="w-full" onClick={handleOpenDialog} id="headlessui-menu-button-:r7:" type="button" ariaHaspopup="true" ariaExpanded="false">
                                <div className="-ml-0.5">
                                    <div className="relativeFlex">
                                        <span className="accountSpan">
                                            <span className="imageSpan">
                                                <img alt="" aria-hidden="true" src="data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%2720%27%20height=%2720%27/%3e" />
                                            </span>
                                                <img className="profileImage rounded-sm" alt="User"
                                                height="40px"
                                                src="/_next/image?url=https%3A%2F%2Flh3.googleusercontent.com%2Fa%2FAGNmyxb1IpFxxihIpCptyrGDGIFPwpm6lvJDtLWogCrCyQ%3Ds96-c&amp;w=48&amp;q=75" decoding="async" dataNimg="intrinsic"
                                                srcset="/_next/image?url=https%3A%2F%2Flh3.googleusercontent.com%2Fa%2FAGNmyxb1IpFxxihIpCptyrGDGIFPwpm6lvJDtLWogCrCyQ%3Ds96-c&amp;w=32&amp;q=75 1x, /_next/image?url=https%3A%2F%2Flh3.googleusercontent.com%2Fa%2FAGNmyxb1IpFxxihIpCptyrGDGIFPwpm6lvJDtLWogCrCyQ%3Ds96-c&amp;w=48&amp;q=75 2x" />
                                            </span>
                                    </div>
                                </div>
                                <div class="overflowHidden">{userInfo.name}</div>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 text-gray-500" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="19" cy="12" r="1"></circle>
                                    <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="chatContainer">
                    <ChatContainer />
                </div>
            </div>
        </div>
    )
}

export default Chat;