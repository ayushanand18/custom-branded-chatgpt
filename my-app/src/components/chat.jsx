import { React, useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { doc, addDoc, getDoc, getDocs, getFirestore, collection, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ChatContainer from './chatcontainer';
import '../styles/chat.css';

function Chat(){
    const firebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const navigate = useNavigate();
    let storageFolders = JSON.parse(localStorage.getItem('folders'))
    if(!storageFolders) storageFolders = {}

    const [pinnedChats, setPinnedChats] = useState([])
    const [folders, setFolders] = useState(storageFolders)
    const [foldersEdit, setFoldersEdit] = useState(false)
    const [dialogVisibility, setDialogVisbility] = useState(false);
    const [quickContextVisibility, setQuickContextVisibility] = useState(false);
    const [openNav, setOpenNav] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isOverlay, setIsOverlay] = useState(false);
    const [userName, setUserName] = useState("");
    const [chatList, setChatList] = useState({})
    const [defaultDoc, setDefaultDoc] = useState([])
    const [contentEditable, setContentEditable] = useState(false)
    const [promptValue, setPromptValue] = useState("")
    const [isOverlayTwo, setIsOverlayTwo] = useState(false)
    const [messageCount, setMessageCount] = useState(0)
    const [newFolderName, setNewFolderName] = useState("")
    const bottomRef = useRef()
    const currentDoc = useRef()
    const [authState, setAuthState] = useState({
        isSignedIn: false,
        pending: true,
        user: null,
    })

    useEffect(() => {
        const unregisterAuthObserver = auth.onAuthStateChanged(user => {
            setAuthState({ user, pending: false, isSignedIn: !!user })
            handleDataFetch(user)
            setUserName(user.displayName)
        })
        return () => unregisterAuthObserver()
        // let's disable eslint warning on next line because this is the intended thing
        // trigger this hook only when content is mounted and not again.
        // we will change user info but don't want to re-render it
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if(window.innerWidth >800 ) setOpenNav(true);
    }, []);

    useEffect(() => {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messageCount]);

    useEffect(() => {
        localStorage.setItem('folders', JSON.stringify(folders));
    }, [folders, foldersEdit]);

    function handleChatSort(category) {
        let newChatList = chatList

        switch(category.target.value){
            case "asc-date":
                console.log(newChatList)
                newChatList = Object.fromEntries(
                    Object.entries(newChatList).sort(
                        ([,a],[,b])=>(a.time.seconds<b.time.seconds)?1:(a.time.seconds>b.time.seconds)?-1:0
                    )
                )
                break
            case "desc-date":
                newChatList = Object.fromEntries(
                    Object.entries(newChatList).sort(
                        ([,a],[,b])=>(a.time.seconds<b.time.seconds)?-1:(a.time.seconds>b.time.seconds)?1:0
                    )
                )
                break
            case "asc-name":
                newChatList = Object.fromEntries(
                    Object.entries(newChatList).sort(
                        ([,a],[,b])=>(a.name.toLowerCase()<b.name.toLowerCase())?1:(a.name.toLowerCase()>b.name.toLowerCase())?-1:0
                    )
                )
                break
            case "desc-name":
                newChatList = Object.fromEntries(
                    Object.entries(newChatList).sort(
                        ([,a],[,b])=>(a.name.toLowerCase()<b.name.toLowerCase())?-1:(a.name.toLowerCase()>b.name.toLowerCase())?1:0
                    )
                )
                break
            default: break
        }
        console.log(newChatList)
        setChatList(newChatList)
    }

    async function handleDataFetch(user) {
        if(!user) return;
        const chatsRef = collection(db, `users/${user?.uid}/chats`);
        const userData = await getDoc(doc(db, `users`,`${user?.uid}`))
        const querySnapshot = await getDocs(chatsRef);

        let chatDocs = {}
        querySnapshot.forEach((doc) => {
            chatDocs[doc.id] = doc.data()
            chatDocs[doc.id].uid = doc.id
            chatDocs[doc.id].show = false
            // folders[doc.data().folderId]?.chats.push(doc.id)
        })
        console.log(chatDocs)

        setChatList(chatDocs)
        setDefaultDoc(chatDocs[userData.data().pinnedChats[0]])
        // setFolderNames(userData.data().folderNames)
        // setFolderIds(userData.data().folderIds)
        setPinnedChats(userData.data().pinnedChats)
        setMessageCount(messageCount+1)
    }

    async function handleChatPin(event, chat_id) {
        if(pinnedChats?.includes(chat_id)) return;
        let newPinnedChats = pinnedChats
        newPinnedChats.push(chat_id)
        setPinnedChats(newPinnedChats)
        await updateDoc(doc(db, `users/`,`${authState.user?.uid}`), {
            pinnedChats: newPinnedChats
        })
    }

    async function handleChatUnpin(event, chat_id) {
        if(!pinnedChats?.includes(chat_id)) return;
        let newPinnedChats = pinnedChats
        newPinnedChats.splice(newPinnedChats.indexOf(chat_id), 1)
        setPinnedChats(newPinnedChats)
        await updateDoc(doc(db, `users/`,`${authState.user?.uid}`), {
            pinnedChats: newPinnedChats
        })
    }

    function handleChatPencil(event){
        currentDoc.current.setAttribute("contenteditable", "true")
        setContentEditable(true)
    }

    async function handleChatRename(event, chat_id) {
        let newDoc = defaultDoc
        newDoc['name'] = currentDoc.current.textContent
        console.log(currentDoc.current.textContent)
        setDefaultDoc(newDoc)

        let newChatList = chatList
        newChatList[newDoc?.uid] = newDoc
        setChatList(newChatList)
        await updateDoc(doc(db, `users/${authState.user?.uid}/chats`, newDoc?.uid), {
            name: newDoc?.name
        })

        setContentEditable(false)
        currentDoc.current.removeAttribute("contenteditable")
    }

    // for hashing a string to generate folderId
    function hashCode(s) {
        return [...s].reduce(
            (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
            0
        );
    }

    function handleCreateFolder() {
        // double hashing, less collision
        let folder_id = hashCode(hashCode(newFolderName).toString())
        let newFolders = folders
        newFolders[folder_id] =  {
                chats: [],
                name: newFolderName,
            }
        setFolders(newFolders)
        console.log(folders)
        setNewFolderName("")
        setFoldersEdit(foldersEdit^true)
    }

    function handleAddToFolder(chat_id, event) {
        Object.keys(folders)?.forEach((folder_uid)=>{
            if(folders[folder_uid]?.chats?.includes(chat_id))
                folders[folder_uid] = (folders[folder_uid].chats?.indexOf(chat_id), 1)
        })
        if(!folders[event.target.value].chats) folders[event.target.value].chats = []

        folders[event.target.value]?.chats?.push(chat_id)
        setFolders(folders)
        setFoldersEdit(foldersEdit^true)
    }

    function handleLogout (){
        signOut(auth).then(()=>{
            navigate('/', { replace: true });
        });
    }

    // pending: need to update the feature
    async function handleNewChatInitiate(){
        let data = {
            name: "new chat " + String(new Date()),
            userPrompts: [],
            gptResponse: [],
            folderId: "",
            time: new Date(),
        }

        await addDoc(collection(db, `users/${authState.user?.uid}/chats`), data)
        .then((doc)=>{
            data['uid'] = doc.id
            data['show'] = false
            setDefaultDoc(data)
            let newChatList = chatList
            newChatList[doc.id] = data
            setChatList(newChatList)
            setMessageCount(0)
        }).catch((error)=>{
            console.log(error)
        })
    }

    // pending: add chatgpt script
    function evalChatgpt(prompt){
        return (new Array(2).fill(String(prompt)+" ").reduce((acc, t) => acc+t))
    }

    async function handleSubmitPrompt(event, prompt=promptValue) {
        event.preventDefault()
        let newDefaultDoc = defaultDoc;
        if(newDefaultDoc?.userPrompts) newDefaultDoc.userPrompts.push(prompt)
        else newDefaultDoc['userPrompts'] = [prompt]
        
        setPromptValue("")
        setDefaultDoc(newDefaultDoc)
        setMessageCount(messageCount+1)

        let response = evalChatgpt(newDefaultDoc.userPrompts.slice(-1))
        if(newDefaultDoc?.userPrompts) newDefaultDoc.gptResponse.push(response)
        else newDefaultDoc['gptResponse'] = [response]

        await updateDoc(doc(db, `users/${authState.user?.uid}/chats`, defaultDoc.uid), {
            userPrompts: newDefaultDoc.userPrompts,
            gptResponse: newDefaultDoc.gptResponse
        })
        .catch((error)=>console.log(error));
        
        setDefaultDoc(newDefaultDoc)
        setMessageCount(messageCount+1)
    }

    function handleOpenDialog() {
        const newVisibility = dialogVisibility^true;
        setDialogVisbility(newVisibility);
        setQuickContextVisibility(false);
    }

    function handleOpenContext() {
        const newVisibility = quickContextVisibility^true;
        setQuickContextVisibility(newVisibility);
        setDialogVisbility(false);
    }

    function handleOpenNav() {
        const nav = openNav^true;
        setOpenNav(nav);
        setIsOverlayTwo(true);
    }

    function handleSettingsOpen() {
        setSettingsOpen(true);
        setIsOverlay(true);
    }

    function handlePromptExample(event) {
        let prompt = event.target.textContent
        setPromptValue(prompt)
        handleSubmitPrompt(event, prompt.split("\"")[1])
    }

    function handleCloseSettings(){
        setSettingsOpen(false);
        setIsOverlay(false);
    }

    function handleTextChange(event) {
        event.preventDefault()
        setPromptValue(event.target.value)
    }

    function handleNameChange(event){
        setUserName(event.target.value);
    }

    function handleUpdateUser(){
        updateProfile(auth.currentUser, {
            displayName: userName,
        }).then(() => {
            alert("profile updated")
        }).catch((error) => {
            alert(error)
        });
        setSettingsOpen(false)
        setIsOverlay(false)
    }

    const pinnedChatsContainer = pinnedChats?.map((chat_id)=>{
        return (
            <li key={chat_id+"li"} className="listItem" onClick={() => {
                setDefaultDoc(chatList[chat_id]) 
                setMessageCount(messageCount+1)
            }}> 
                <svg key={chat_id}
                    stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span key={chat_id} className="span">
                    {chatList[chat_id] && chatList[chat_id]?.name}
                </span>
                <span className="rounded-md" onClick={(event)=>handleChatUnpin(event, chat_id)} style={{backgroundColor: "transparent"}}>
                    <svg id="SvgjsSvg1001" width="24" height="24" xmlns="http://www.w3.org/2000/svg" version="1.1" style={{transform: "rotate(-45deg)", color: "rgb(255, 255, 255)", overflow: "visible"}}>
                        <defs id="SvgjsDefs1002"/>
                        <g id="SvgjsG1008">
                            <svg xmlns="http://www.w3.org/2000/svg" baseProfile="tiny" version="1.2" viewBox="0 0 24 24" width="20" height="20">
                            <path d="M16.729 4.271a1 1 0 0 0-1.414-.004 1.004 1.004 0 0 0-.225.355c-.832 1.736-1.748 2.715-2.904 3.293C10.889 8.555 9.4 9 7 9a1.006 1.006 0 0 0-.923.617 1.001 1.001 0 0 0 .217 1.09l3.243 3.243L5 20l6.05-4.537 3.242 3.242a.975.975 0 0 0 .326.217c.122.051.252.078.382.078s.26-.027.382-.078A.996.996 0 0 0 16 18c0-2.4.444-3.889 1.083-5.166.577-1.156 1.556-2.072 3.293-2.904a.983.983 0 0 0 .354-.225 1 1 0 0 0-.004-1.414l-3.997-4.02z" fill="#fff" className="color000 svgShape"/>
                            </svg>
                        </g>
                        <svg height="30" width="30">
                            <line x1="-2" y1="8" x2="20" y2="12" style={{stroke:"#fff",strokeWidth:"3"}}/>
                        </svg>
                    </svg>
                </span>
            </li>
        )
    })

    const foldersContainer = Object.keys(folders)?.map((folder_id, index) => {
        return (
        <details>
            <summary>
                <li key={folder_id+"li"} className="listItem">
                    <svg key={folder_id} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128" width="36" height="36">
                        <path stroke="#fff" strokeLinecap="round" strokeWidth="6" d="M26 45.5C26 35.835 33.835 28 43.5 28V28L55.3399 28C58.7317 28 61.7549 30.1389 62.8838 33.3374L65.1727 39.8226C66.2737 42.9422 69.1813 45.0623 72.4881 45.1568L84.5 45.5V45.5C94.0831 45.2262 102 52.9202 102 62.5071L102 74.5V80C102 90.4934 93.4934 99 83 99V99L64 99L45 99V99C34.5066 99 26 90.4934 26 80L26 66L26 45.5Z" ></path>
                    </svg>
                    {folders[folder_id]?.name}
                </li>
            </summary>
            <p key={folder_id+"p"} className="openFolderChats" style={{marginTop:"0px", marginBottom:'0px'}}>
                <ul key={folder_id+"ul"}>{
                    folders[folder_id].chats?.map((chat_id) => {
                        return (<li key={chat_id} className="listItem" onClick={() => {
                            setDefaultDoc(chatList[chat_id]) 
                            setMessageCount(messageCount+1)
                        }}>
                            {chatList[chat_id]?.name}
                        </li>)
                    })
                }</ul>
            </p>
        </details>
        )
    })

    const allChats = Object.keys(chatList)?.map((chat_id, index) => {
        return (
            <li key={index+"li"} className="listItem" onClick={() => {
                    setDefaultDoc(chatList[chat_id]) 
                    setMessageCount(messageCount+1)
                }}
                style={{flexDirection:"column"}}
            >
                <div style={{width: "100%", flexDirection:"row", background:"inherit"}}>
                    
                    <img key={index}
                        src="https://www.iconpacks.net/icons/4/free-icon-open-folder-11477.png" alt='three-dots' 
                        height='22' style={{filter: "invert(100%)", height: "16px", padding: "0px 5px 0px 0px"}}
                        onClick={()=>{chatList[chat_id]['show'] ^= true;}}
                        />
                    <span key={index} className="span">
                        {chatList[chat_id]?.name}
                    </span>
                    <span 
                        className="rounded-md" 
                        onClick={(event)=>handleChatPin(event, chat_id)} 
                        style={{background: "transparent"}}>
                            <svg id="SvgjsSvg1001" width="24" height="24" xmlns="http://www.w3.org/2000/svg" version="1.1" 
                                style={{transform:"rotate(-45deg)", color: "#fff", overflow:"visible"}}>
                                    <defs id="SvgjsDefs1002"></defs>
                                    <g id="SvgjsG1008">
                                    <svg xmlns="http://www.w3.org/2000/svg" baseProfile="tiny" version="1.2" viewBox="0 0 24 24" width="20" height="20" >
                                    <path d="M16.729 4.271a1 1 0 0 0-1.414-.004 1.004 1.004 0 0 0-.225.355c-.832 1.736-1.748 2.715-2.904 3.293C10.889 8.555 9.4 9 7 9a1.006 1.006 0 0 0-.923.617 1.001 1.001 0 0 0 .217 1.09l3.243 3.243L5 20l6.05-4.537 3.242 3.242a.975.975 0 0 0 .326.217c.122.051.252.078.382.078s.26-.027.382-.078A.996.996 0 0 0 16 18c0-2.4.444-3.889 1.083-5.166.577-1.156 1.556-2.072 3.293-2.904a.983.983 0 0 0 .354-.225 1 1 0 0 0-.004-1.414l-3.997-4.02z" fill="#fff" class="color000 svgShape"></path>
                            </svg></g></svg>
                    </span>
                </div>
                <div className="context-menu" style={{display: chatList[chat_id]?.show?"flex":"none"}}>
                    <span className="stickyHead">Add to folder</span>
                    <select className="addFolder" onChange={(event)=>handleAddToFolder(chat_id, event)}>
                        <option hidden disabled selected value>--folder--</option>
                        {Object.keys(folders)?.map((folder_id, index)=>{
                            return (
                                <option 
                                    key={index}
                                    value={folder_id} >
                                        {folders[folder_id]?.name}
                                </option>
                            )
                        })}
                    </select>
                    <span className="addFolder">
                        <input type="text" placeholder="enter folder name" value={newFolderName} onChange={(event) => {setNewFolderName(event.target.value)}}/>
                        <button className="rounded-md" onClick={handleCreateFolder} style={{backgroundColor: "greenyellow", fontSize:".75rem", fontWeight: "600"}}>
                            NEW
                        </button>
                    </span>
                </div>
            </li>
        )
    })

    return (
        <div className="wrapper">
            <div className="settingContainer" style={{display:settingsOpen?"flex":"none"}}>
                <h2 style={{color:"white"}}>Settings</h2>
                <div>Signed in as {authState.user?.email}</div>
                <label for="name">Name</label>
                <input type="text" className="input nameField" id="nameField" placeholder="name" value={userName} onChange={handleNameChange}/>
                <div className="buttonGroup">
                    <button className="updateUserInfo" onClick={handleUpdateUser}>Update</button>
                    <button className="closeSettings" onClick={handleCloseSettings}>Cancel</button>
                </div>
            </div>
            <div className="overlay" style={{display:isOverlay?"block":"none"}}></div>
            <div className="container">
                <div className="stickyTopbar">
                    <button type="button" onClick={handleOpenNav} className="inlineFlex">
                        <span className="sr-only">Open sidebar</span>
                        <svg stroke="currentColor" fill="none" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <h1 className="flexTextNormal">{(defaultDoc && defaultDoc?.name) || `ChatGPT` }</h1>
                    {/* 
                    hiding this add button for now
                    <button type="button" className="buttonAdd">
                        <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button> */}
                </div>
                <div className="navSection" style={{display:openNav?"flex":"none"}}>
                    <div className="flexDiv">
                        <div className="navMenu">
                            <div className="newChatButton" onClick={handleNewChatInitiate}>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                New chat
                            </div>
                            <div className="stickyLabel">
                                <div className="labelHeading">
                                    Opened Chat
                                </div>
                            </div>
                            <ol>
                                <li className="listItem"> 
                                    <svg
                                        stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <span className="span" ref={currentDoc}>
                                        {defaultDoc?.name}
                                    </span>
                                    <span style={{display:contentEditable?"none":"flex"}} className="rounded-md" onClick={(event)=>handleChatPencil(event)}>
                                        RENAME
                                    </span>
                                    <span style={{display:contentEditable?"flex":"none", backgroundColor:"#43e500"}} className="rounded-md" onClick={(event)=>handleChatRename(event)}>
                                        DONE
                                    </span>
                                </li>
                            </ol>
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
                            <div className="stickyLabel">
                            <div className="labelHeading">
                                All chats
                                <span>
                                    Sort by:
                                    <select className="select" onChange={handleChatSort}>
                                        <option value="asc-date">Asc: Date</option>
                                        <option value="desc-date">Desc: Date</option>
                                        <option value="asc-name">Asc: Name</option>
                                        <option value="desc-date">Desc: Date</option>
                                    </select>
                                </span>
                            </div>
                        </div>
                        <div className="folders">
                            <ol>
                                {allChats}
                            </ol>
                        </div>
                        </div>
                    </div>
                    <div className="absolute" style={{display: quickContextVisibility?"inline":"none", bottom:"0rem", marginBottom:"7.2rem"}}>
                        <nav role="none" className="shortDialog" >
                            <a as="a" href="#faq" target="_blank" className="py-3 transitionColors" id="headlessui-menu-item-:r2u:" role="menuitem" tabindex="-1" >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                Save Context
                            </a>
                            <span href="#" as="button" className="py-3 transitionColors gap-3" id="headlessui-menu-item-:r30:" role="menuitem" tabindex="-1" >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
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
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Help &amp; FAQ
                                </a>
                                <span href="#" as="button" className="py-3 transitionColors" id="headlessui-menu-item-:r30:" role="menuitem" tabindex="-1" onClick={handleSettingsOpen} >
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    Settings
                                </span>
                                <span href="#" as="button" className="py-3 transitionColors gap-3" role="menuitem" tabindex="-1" onClick={handleLogout}>
                                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Log out
                                </span>
                            </nav>
                        </div>

                        <div className="groupRelative py-3">
                            <button className="w-full" onClick={handleOpenDialog} id="headlessui-menu-button-:r7:" type="button" ariaHaspopup="true" ariaExpanded="false">
                                <div className="-ml-0.5">
                                    <div className="relativeFlex">
                                        <span className="accountSpan">
                                            <span className="imageSpan">
                                                <img alt="" aria-hidden="true" src="data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%2720%27%20height=%2720%27/%3e" />
                                            </span>
                                                <img className="profileImage rounded-sm" alt="User"
                                                height="40px"
                                                src="https://images.unsplash.com/photo-1605106901227-991bd663255c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHNxdWFyZSUyMGRwfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" decoding="async" dataNimg="intrinsic"
                                                srcSet="https://images.unsplash.com/photo-1605106901227-991bd663255c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHNxdWFyZSUyMGRwfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" />
                                            </span>
                                    </div>
                                </div>
                                <div className="overflowHidden">{authState.user?.displayName}</div>
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
                    <div className="overlay" style={{display:isOverlayTwo?"block":"none"}} 
                        onClick={()=>{
                            setOpenNav(false);
                            setIsOverlayTwo(false)
                        }}></div>
                    <ChatContainer 
                        defaultDoc={defaultDoc} 
                        handleSubmitPrompt={handleSubmitPrompt}
                        promptValue={promptValue}
                        handleTextChange={handleTextChange}
                        bottomRef={bottomRef}
                        handlePromptExample={handlePromptExample}
                        />
                </div>
            </div>
        </div>
    )
}

export default Chat;