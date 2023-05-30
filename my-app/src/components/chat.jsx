import { React, useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { doc, addDoc, getDoc, deleteDoc, getDocs, getFirestore, collection, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ChatContainer from './chatcontainer';
import '../styles/chat.css';

import { SSE } from "sse";
  
class DocData {
    constructor(name, userPrompts, gptResponse, folderId, time, uid) {
        this.name = name
        this.userPrompts = userPrompts
        this.gptResponse = gptResponse
        this.folderId = folderId
        this.time = time
        this.uid = uid
        this.showFolderDialog = false
        this.showContentEdit = false
        this.showThreeDotMenu = false
    }
}

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
    const [defaultDoc, setDefaultDoc] = useState(null)
    const [openedDocId, setOpenedDocId] = useState(null)
    const [promptValue, setPromptValue] = useState("")
    const [isOverlayTwo, setIsOverlayTwo] = useState(false)
    const [messageCount, setMessageCount] = useState(0)
    const [newFolderName, setNewFolderName] = useState("")
    const [isMessageVisible, setIsMessageVisible] = useState(false)
    const [newFolderCreating, setNewFolderCreating] = useState(false)
    const [folderNameN, setFolderNameN] = useState("")
    const [forceRender, setForceRender] = useState(true)
    const bottomRef = useRef()
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

    async function handleDataFetch(user) {
        if(!user) return;
        const chatsRef = collection(db, `users/${user?.uid}/chats`);
        const userData = await getDoc(doc(db, `users`,`${user?.uid}`))
        const querySnapshot = await getDocs(chatsRef);

        let chatDocs = {}
        querySnapshot.forEach((doc) => {
            chatDocs[doc.id] = Object.setPrototypeOf(
                {...doc.data(), ...{"uid":doc.id}}, DocData.prototype
                )
        })

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

    function handleChatSort(category) {
        let newChatList = chatList

        switch(category.target.value){
            case "asc-date":
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
        setChatList(newChatList)
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

    function handleChatPencil(chat_id){
        chatList[chat_id].showContentEdit = true;
        setChatList(chatList)
    }

    function handleChatNameUpdate(event, chat_id) {
        chatList[chat_id].name = event.target.textContent
        setChatList(chatList)
    }

    async function handleChatRename(chat_id) {
        await updateDoc(doc(db, `users/${authState.user?.uid}/chats`, chatList[chat_id]?.uid), {
            name: chatList[chat_id].name
        })

        chatList[chat_id].showContentEdit = false;
        setChatList(chatList)
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
        setNewFolderName("")
        setFoldersEdit(foldersEdit^true)
        setNewFolderCreating(false)
    }

    function handleDeleteFolder(folder_id) {
        delete folders[folder_id]
        let newFolders = folders;
        setFolders(newFolders)
        setFoldersEdit((state) => !state)
    }

    function handleAddToFolder(chat_id) {
        // do nothing if the chat is already present
        if(folders[folderNameN] && folders[folderNameN].chats.includes(chat_id)) 
            return
        
        Object.keys(folders)?.forEach((folder_uid)=>{
            if(folders[folder_uid] && folders[folder_uid].chats && folders[folder_uid].chats.includes(chat_id))
                folders[folder_uid].chats = folders[folder_uid].chats.splice(folders[folder_uid].chats.indexOf(chat_id), 1)
        })
        if(!folders[folderNameN].chats) folders[folderNameN].chats = []

        folders[folderNameN]?.chats?.push(chat_id)
        setFolders(folders)
        setFoldersEdit(foldersEdit^true)
        setIsMessageVisible(true)
        setTimeout(()=>{
            setIsMessageVisible(false)
        }, 2500)
    }

    function handleLogout (){
        signOut(auth).then(()=>{
            navigate('/', { replace: true });
        });
    }

    async function handleNewChatInitiate(){
        let data = {
            name: "new chat" + new Date(),
            userPrompts: [],
            gptResponse: [],
            folderId: "",
            time: new Date(),
        }
        let obj;

        await addDoc(collection(db, `users/${authState.user?.uid}/chats`), data)
        .then((doc)=>{
            obj = Object.setPrototypeOf(
                {...data, ...{"uid":doc.id}}, DocData.prototype
                )
            setDefaultDoc(obj)
            let newChatList = chatList
            newChatList[doc.id] = data
            setChatList(newChatList)
            setMessageCount(0)
        }).catch((error)=>{
            console.log(error)
        })
        return obj
    }

    function evalResp(data) {
        setForceRender((state) => !state)
        return data
    }

    async function handleSubmitPrompt(event, prompt=promptValue, defaultdoc=defaultDoc) {
        event.preventDefault()
        if(!defaultdoc) {
            defaultdoc = await handleNewChatInitiate()
        }
        let newDefaultDoc = defaultdoc;
        if(newDefaultDoc?.userPrompts) newDefaultDoc.userPrompts.push(prompt)
        else newDefaultDoc.userPrompts = [prompt]

        setPromptValue("")
        setDefaultDoc(newDefaultDoc)
        setMessageCount(messageCount+1)

        let lastMessage = defaultDoc?.gptResponse?.slice(-1)
        // let SSE_URL = `https://8000-ayushanand1-custombrand-sscwxw1m6v2.ws-us98.gitpod.io/get_gpt_response?context=${lastMessage}&user=${prompt}` // test
        let SSE_URL = `https://custom-branded-chatgpt-api.onrender.com/get_gpt_response?context=${lastMessage}&user=${prompt}` // production

        let response = "thinking ..."
        let resp = ""
        if(newDefaultDoc?.userPrompts) newDefaultDoc.gptResponse.push(response)
        else newDefaultDoc.gptResponse = [response]
        setDefaultDoc(newDefaultDoc)

        let source = new SSE(SSE_URL);

        source.addEventListener("message", async (e) => {
            console.log(e.data)
            resp += " " + e.data
            newDefaultDoc.gptResponse[newDefaultDoc.gptResponse.length-1] = resp
            setForceRender((state) => !state)
        });

        source.addEventListener("readystatechange", (e) => {
            console.log("ready")
        });

        source.stream();

        newDefaultDoc.gptResponse[newDefaultDoc.gptResponse.length-1] = resp
        setDefaultDoc(newDefaultDoc)
        setMessageCount(messageCount+1)
        await updateDoc(doc(db, `users/${authState.user?.uid}/chats`, defaultdoc.uid), {
            userPrompts: newDefaultDoc.userPrompts,
            gptResponse: newDefaultDoc.gptResponse
        })
        .catch((error)=>console.log(error));        
    }

    async function handleDeleteChat(chat_id){
        if(defaultDoc?.uid===chat_id) {
            // you also need to reset the new defaultDoc
            setDefaultDoc(chatList[Object.keys(chatList)[0]])
        }
        delete chatList[chat_id]
        setChatList(chatList)
        if(pinnedChats.includes(chat_id))
            pinnedChats.remove(pinnedChats.indexOf(chat_id))
        await deleteDoc(doc(db, `users/${authState.user.uid}/chats`, chat_id))
        .then(()=>{
            console.log("deleted!")
        })
        .catch((error)=>{console.log(error)})
        setMessageCount(messageCount-1)
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

    async function handlePromptExample(event) {
        let prompt = event.target.textContent
        setPromptValue(prompt)
        if(!defaultDoc) {
            // handle when a new screen is shown
            let data = await handleNewChatInitiate()
            handleSubmitPrompt(event, prompt.split("\"")[1], data)
        }
        else {
            handleSubmitPrompt(event, prompt.split("\"")[1])
        }
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
                <li key={folder_id+"li"} style={{display: "flex",justifyContent: "space-between",alignItems: "center"}} className="listItem">
                    <span style={{display:"flex", gap:".4rem", alignItems: "center"}}>
                        <svg key={folder_id} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128" width="36" height="36">
                            <path stroke="#fff" strokeLinecap="round" strokeWidth="6" d="M26 45.5C26 35.835 33.835 28 43.5 28V28L55.3399 28C58.7317 28 61.7549 30.1389 62.8838 33.3374L65.1727 39.8226C66.2737 42.9422 69.1813 45.0623 72.4881 45.1568L84.5 45.5V45.5C94.0831 45.2262 102 52.9202 102 62.5071L102 74.5V80C102 90.4934 93.4934 99 83 99V99L64 99L45 99V99C34.5066 99 26 90.4934 26 80L26 66L26 45.5Z" ></path>
                        </svg>
                        {folders[folder_id]?.name}
                    </span>
                    <span onClick={()=>handleDeleteFolder(folder_id)}>
                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.4em" xmlns="http://www.w3.org/2000/svg">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </span>
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
            <li key={index+"li"} className='listItem'
                style={{flexDirection:"column"}}>
                <div
                    className={(chat_id===defaultDoc?.uid)?'divLi hovered':'divLi'} 
                    style={{width: "100%", flexDirection:"row", background:"inherit"}}
                    onClick={() => {
                        setDefaultDoc(chatList[chat_id]) 
                        setMessageCount(messageCount+1)
                    }} >
                    <span dataRole="tick-rename-done"
                        style={{display:chatList[chat_id]?.showContentEdit?"flex":"none"}} 
                        onClick={()=>handleChatRename(chat_id)}>
                        <svg height="12" viewBox="0 -10 40 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="5" x2="15" y2="15" style={{stroke:"#fff",strokeWidth:"4"}} />
                            <line x1="13" y1="15" x2="45" y2="-20" style={{stroke:"#fff",strokeWidth:"4"}} />
                        </svg>
                    </span>
                    <span style={{display:"flex", gap:".4rem", alignItems: "center"}}>
                        <img key={index}
                            src="https://www.iconpacks.net/icons/4/free-icon-open-folder-11477.png" alt='three-dots' 
                            height='22' style={{filter: "invert(100%)", height: "16px", padding: "0px 5px 0px 0px"}}
                            onClick={()=>{chatList[chat_id].showFolderDialog ^= true;}}
                            />
                        <span key={index}
                            onChange={(event)=> handleChatNameUpdate(event, chat_id)} 
                            onKeyDown={(event)=> handleChatNameUpdate(event, chat_id)}
                            className="span" style={{WebkitUserModify: (chatList[chat_id]?.showContentEdit)?"read-write":"read-only"}}>
                            {chatList[chat_id]?.name}
                        </span>
                    </span>

                    <span 
                        style={{minWidth: "20px",  display: "flex", justifyContent:"center", padding: "0 .5em 0 .5em"}} 
                        onClick={() => {setOpenedDocId((x) => x?null:chat_id)}}>
                        <img 
                            src="https://img.uxwing.com/wp-content/themes/uxwing/download/web-app-development/more-options-icon.svg" 
                            height="20px" 
                            alt="three-dots" 
                            style={{filter: "invert(100%)"}}
                            />
                    </span>                    
                </div>
                <div className="shortHandMenu"
                    onClick={()=>{setOpenedDocId(false)}}
                    style={{display: (chat_id===openedDocId)?"contents":"none"}}>
                    <ul>
                        <li 
                            className="shortHandMenu-Item"
                            onClick={()=>handleChatPencil(chat_id)}>
                            <span
                                className="pencil-icon"
                                style={{display: (chat_id===openedDocId)?"flex":"none"}} 
                                >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.4em" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                            </span> Rename
                        </li>
                        <li className="shortHandMenu-Item" onClick={()=>handleDeleteChat(chat_id)}>
                            <span 
                                className="delete-icon" 
                                style={{display: (chat_id===openedDocId)?"flex":"none"}} 
                                >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.4em" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </span> Delete
                        </li>
                        <li className="shortHandMenu-Item"
                            onClick={(event)=>handleChatPin(event, chat_id)} >
                            <span 
                                style={{background: "transparent"}}>
                                    <svg id="SvgjsSvg1001" width="24" height="24" xmlns="http://www.w3.org/2000/svg" version="1.1" 
                                        style={{transform:"rotate(-45deg)", color: "#fff", overflow:"visible"}}>
                                            <defs id="SvgjsDefs1002"></defs>
                                            <g id="SvgjsG1008">
                                                <svg xmlns="http://www.w3.org/2000/svg" baseProfile="tiny" version="1.2" viewBox="0 0 24 24" width="16" height="16" >
                                                    <path d="M16.729 4.271a1 1 0 0 0-1.414-.004 1.004 1.004 0 0 0-.225.355c-.832 1.736-1.748 2.715-2.904 3.293C10.889 8.555 9.4 9 7 9a1.006 1.006 0 0 0-.923.617 1.001 1.001 0 0 0 .217 1.09l3.243 3.243L5 20l6.05-4.537 3.242 3.242a.975.975 0 0 0 .326.217c.122.051.252.078.382.078s.26-.027.382-.078A.996.996 0 0 0 16 18c0-2.4.444-3.889 1.083-5.166.577-1.156 1.556-2.072 3.293-2.904a.983.983 0 0 0 .354-.225 1 1 0 0 0-.004-1.414l-3.997-4.02z" fill="#fff" class="color000 svgShape"></path>
                                                </svg>
                                            </g>
                                    </svg> Pin
                            </span>
                        </li>
                    </ul>
                </div>
                <div className="context-menu" style={{display: chatList[chat_id]?.showFolderDialog?"flex":"none"}}>
                    <span className="stickyHead">
                        Add to folder
                        {isMessageVisible && <span className="folderSuccess rounded-md" >
                            <svg height="10" viewBox="0 -10 40 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <line x1="0" y1="5" x2="15" y2="15" style={{stroke:"#fff",strokeWidth:"4"}} />
                                <line x1="13" y1="15" x2="45" y2="-20" style={{stroke:"#fff",strokeWidth:"4"}} />
                            </svg> added!
                        </span>}
                    </span>
                    <select className="addFolder" onChange={(event)=>setFolderNameN(event.target.value)}>
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
                    <button className="rounded-md" onClick={(event) => handleAddToFolder(chat_id)}>MOVE</button>
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
                                    Pinned Chats
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
                                    <span style={{display:newFolderCreating?"none":"inherit"}} 
                                        className="rounded-md" onClick={()=>{
                                        setNewFolderCreating(true);
                                    }}>+ NEW</span>
                                    <span style={{display:newFolderCreating?"flex":"none", position: "absolute", left:'72px', right:'0px', alignItems:'center'}} className="addFolder">
                                        <input type="text" placeholder="enter folder name" value={newFolderName} onChange={(event) => {setNewFolderName(event.target.value)}}/>
                                        <span onClick={handleCreateFolder}>
                                            <svg height="12" viewBox="0 -10 40 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <line x1="0" y1="5" x2="15" y2="15" style={{stroke:"#fff",strokeWidth:"4"}} />
                                                <line x1="13" y1="15" x2="45" y2="-20" style={{stroke:"#fff",strokeWidth:"4"}} />
                                            </svg>
                                        </span>
                                    </span>
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
                        forceRender={forceRender}
                        />
                </div>
            </div>
        </div>
    )
}

export default Chat;