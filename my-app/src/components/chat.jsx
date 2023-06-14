import { React, useState, useEffect, useRef } from "react"
import { initializeApp } from "firebase/app"
import { getAuth, sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth"
import { doc, addDoc, getDoc, deleteDoc, getDocs, getFirestore, collection, updateDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import ChatContainer from './chatcontainer'
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
        this.showThreeDots = false
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
    const [messageCount, setMessageCount] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [isMessageVisible, setIsMessageVisible] = useState(false)
    const [newFolderCreating, setNewFolderCreating] = useState(false)
    const [folderNameN, setFolderNameN] = useState("")
    const [forceRender, setForceRender] = useState(true)
    const [showStopGen, setShowStopGen] = useState(false)
    const [SSESource, setSSESource] = useState()
    const [forceChatList, setForceChatList] = useState(false)
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
        if(defaultDoc && defaultDoc.uid && defaultDoc.name.slice(0, 8)==='new chat' && defaultDoc.gptResponse<=1) {
            defaultDoc.name = "rename chat first"
        }
    }, [defaultDoc])

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
        // setDefaultDoc(chatDocs[userData.data().pinnedChats[0]]) 
        // setFolderNames(userData.data().folderNames)
        // setFolderIds(userData.data().folderIds)
        setPinnedChats(userData.data().pinnedChats)
        setMessageCount((state) => !state)
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
        if(folders[folderNameN] && folders[folderNameN].chats && folders[folderNameN].chats.includes(chat_id)) 
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
            chatList[chat_id].showFolderDialog = false;
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
            newChatList[doc.id] = {...data, ...{"uid":doc.id}}
            setChatList(newChatList)
            setMessageCount((state) => !state)
        }).catch((error)=>{
            console.log(error)
        })
        return obj
    }

    function handleStopGen(event){
        event.preventDefault()
        SSESource.close()
        setShowStopGen(false)
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
        setMessageCount((state) => !state)

        let lastMessage = defaultDoc?.gptResponse?.slice(-1)
        // let SSE_URL = `https://8000-ayushanand1-custombrand-sscwxw1m6v2.ws-us98.gitpod.io/get_gpt_response?context=${lastMessage}&user=${prompt}` // test
        let SSE_URL = `https://custom-branded-chatgpt-api.onrender.com/get_gpt_response?context=${lastMessage}&user=${prompt}` // production

        let response = ""
        if(newDefaultDoc?.userPrompts) newDefaultDoc.gptResponse.push(response)
        else newDefaultDoc.gptResponse = [response]
        setDefaultDoc(newDefaultDoc)

        let source = new SSE(SSE_URL);
        
        setSSESource(source)

        source.addEventListener("message", async (e) => {
            console.log(e.data, e.data.length)
            if(e.data.length<=1) response += `\n`
            else if(e.data[0]==="'") {
                if(response.slice(-3)===`|\n` && e.data[1]!=='|') response+=`\n`

                if(e.data[e.data.length-1]==="'") response += e.data.slice(1, -1)
                else response += e.data.slice(1)
            }
            newDefaultDoc.gptResponse[newDefaultDoc.gptResponse.length-1] = response
            setForceRender((state) => !state)
            setMessageCount((state) => !state)
        });

        source.addEventListener("readystatechange", async (e) => {
            setShowStopGen((state) => !state)
            setForceRender((state) => !state)
            setMessageCount((state) => !state)

            if(e.readyState===2) {
                console.log(response)
                if(newDefaultDoc.userPrompts.length===1){
                    // await fetch(`https://8000-ayushanand1-custombrand-sscwxw1m6v2.ws-us98.gitpod.io/generate_title?context=${response}`) <- test
                    await fetch(`https://custom-branded-chatgpt-api.onrender.com/generate_title?context=${response}`)
                    .then((res) => res.json())
                    .then((data) => {
                        console.log(data);
                        if(data.data[0]==='"' && data.data[data.data.length-1]==='"') 
                            newDefaultDoc.name=data.data.slice(1, -1)
                        else newDefaultDoc.name = data.data
                    })
                    .then(()=> {
                        setDefaultDoc(newDefaultDoc);
                        chatList[newDefaultDoc.uid] = newDefaultDoc;
                        setChatList(chatList);
                        setForceChatList((state) => !state)
                    })
                }
                await updateDoc(doc(db, `users/${authState.user?.uid}/chats`, defaultdoc.uid), {
                    userPrompts: newDefaultDoc.userPrompts,
                    gptResponse: newDefaultDoc.gptResponse,
                    name: newDefaultDoc.name
                })
                .catch((error)=>console.log(error));
            }
        });

        source.stream();

        setDefaultDoc(newDefaultDoc)
        setShowStopGen((state) => !state)
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
        setMessageCount((state) => !state)
    }

    function handleResetPassword(event) {
        sendPasswordResetEmail(auth, authState.user.email)
        .then(() => {
            alert('Password reset link sent to your email!')
            handleCloseSettings()
        })
        .catch((error) => {
            alert('An error occurred', error)
        })
    }

    function handleOpenDialog() {
        setDialogVisbility((state) => !state)
        setQuickContextVisibility(false)
    }

    function handleOpenContext() {
        setQuickContextVisibility((state) => !state)
        setDialogVisbility(false)
    }

    function handleSaveContext(e) {
        handleSubmitPrompt(e, "")
    }

    function handleOpenNav() {
        setOpenNav((state) => !state);
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
        setSettingsOpen(false)
        setIsOverlay(false)
        setDialogVisbility(false)
    }

    function handleTextChange(event) {
        event.preventDefault()
        event.target.style.height = "auto";

        if (event.target.scrollHeight <= 200) {
            event.target.style.height = event.target.scrollHeight + "px";
            event.target.style.overflowY = "hidden";
        } else {
            event.target.style.height = "200px";
            event.target.style.overflowY = "scroll";
        }
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
                setMessageCount((state) => !state)
            }}> 
                <svg key={chat_id+"svg"}
                    stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span key={chat_id+"span1"} className="span">
                    {chatList[chat_id] && chatList[chat_id]?.name}
                </span>
                <span key={chat_id+"span"} className="rounded-md" onClick={(event)=>handleChatUnpin(event, chat_id)} style={{backgroundColor: "transparent"}}>
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
        <details key={index+"details"}>
            <summary>
                <li key={folder_id+"li"} style={{display: "flex", justifyContent: "space-between", alignItems: "center"}} className="listItem bg-white-hover">
                    <span style={{display:"flex", gap:".4rem", alignItems: "center"}}>
                        <svg key={folder_id} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128" width="36" height="36">
                            <path stroke="#fff" strokeLinecap="round" strokeWidth="6" d="M26 45.5C26 35.835 33.835 28 43.5 28V28L55.3399 28C58.7317 28 61.7549 30.1389 62.8838 33.3374L65.1727 39.8226C66.2737 42.9422 69.1813 45.0623 72.4881 45.1568L84.5 45.5V45.5C94.0831 45.2262 102 52.9202 102 62.5071L102 74.5V80C102 90.4934 93.4934 99 83 99V99L64 99L45 99V99C34.5066 99 26 90.4934 26 80L26 66L26 45.5Z" ></path>
                        </svg>
                        {folders[folder_id]?.name}
                    </span>
                    <span onClick={()=>handleDeleteFolder(folder_id)}>
                        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.4em" xmlns="http://www.w3.org/2000/svg">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </span>
                </li>
            </summary>
            <span key={folder_id+"p"} className="openFolderChats" style={{marginTop:"0px", marginBottom:'0px'}}>
                <ul key={folder_id+"ul"}>{
                    folders[folder_id].chats?.map((chat_id) => {
                        return (<li key={chat_id} className="listItem" style={{borderBottom: "1px solid #818181"}} onClick={() => {
                            setDefaultDoc(chatList[chat_id]) 
                            setMessageCount((state) => !state)
                        }}>
                            {chatList[chat_id]?.name}
                        </li>)
                    })
                }</ul>
            </span>
        </details>
        )
    })

    const allChats = Object.keys(chatList)?.map((chat_id, index) => {
        return (
            <li key={index+"li"} className='listItem'
                style={{flexDirection:"column"}}
                onMouseEnter={() => chatList[chat_id].showThreeDots = true}
                onMouseLeave={() => chatList[chat_id].showThreeDots = false}
                >
                <div
                    className={(chat_id===defaultDoc?.uid)?'divLi hovered':'divLi'} 
                    style={{width: "100%", flexDirection:"row", background:"inherit"}}
                    onClick={() => {
                        setDefaultDoc(chatList[chat_id]) 
                        setMessageCount((state) => !state)
                    }} >
                    <span data-role="tick-rename-done"
                        style={{display:chatList[chat_id]?.showContentEdit?"flex":"none"}} 
                        onClick={()=>handleChatRename(chat_id)}>
                        <svg height="12" viewBox="0 -10 40 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="5" x2="15" y2="15" style={{stroke:"#fff",strokeWidth:"4"}} />
                            <line x1="13" y1="15" x2="45" y2="-20" style={{stroke:"#fff",strokeWidth:"4"}} />
                        </svg>
                    </span>
                    <span style={{display:"flex", gap:".4rem", alignItems: "center"}}>
                        <svg key={index+"img"}
                            width="24px" height="24px" viewBox="0 0 48 48" version="1.1"
                            style={{filter: "invert(100%)", height: "20px", padding: "0px 0px 0px 0px"}}
                            onClick={()=>{chatList[chat_id].showFolderDialog ^= true;}}
                            >
                            <g id="🔍-Product-Icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                <g id="ic_fluent_folder_move_48_regular" fill="#212121" fill-rule="nonzero">
                                    <path d="M17.0606622,9 C17.8933043,9 18.7000032,9.27703406 19.3552116,9.78392956 L19.5300545,9.92783739 L22.116207,12.1907209 C22.306094,12.356872 22.5408581,12.4608817 22.7890575,12.4909364 L22.9393378,12.5 L40.25,12.5 C42.2542592,12.5 43.8912737,14.0723611 43.994802,16.0508414 L44,16.25 L44.0009146,24.0563927 C43.2471782,23.3816422 42.4076405,22.8007736 41.500684,22.3321695 L41.5,16.25 C41.5,15.6027913 41.0081253,15.0704661 40.3778052,15.0064536 L40.25,15 L22.8474156,14.9988741 L20.7205012,17.6147223 C20.0558881,18.4327077 19.0802671,18.9305178 18.0350306,18.993257 L17.8100737,19 L6.5,18.999 L6.5,35.25 C6.5,35.8972087 6.99187466,36.4295339 7.62219476,36.4935464 L7.75,36.5 L24.5185779,36.5004632 C24.786765,37.3812299 25.1535218,38.2190449 25.6059991,39.0010592 L7.75,39 C5.74574083,39 4.10872626,37.4276389 4.00519801,35.4491586 L4,35.25 L4,12.75 C4,10.7457408 5.57236105,9.10872626 7.55084143,9.00519801 L7.75,9 L17.0606622,9 Z M17.0606622,11.5 L7.75,11.5 C7.10279131,11.5 6.5704661,11.9918747 6.50645361,12.6221948 L6.5,12.75 L6.5,16.499 L17.8100737,16.5 C18.1394331,16.5 18.4534488,16.3701335 18.6858203,16.1419575 L18.7802162,16.0382408 L20.415,14.025 L17.883793,11.8092791 C17.693906,11.643128 17.4591419,11.5391183 17.2109425,11.5090636 L17.0606622,11.5 Z M36,23 C41.5228475,23 46,27.4771525 46,33 C46,38.5228475 41.5228475,43 36,43 C30.4771525,43 26,38.5228475 26,33 C26,27.4771525 30.4771525,23 36,23 Z M35.9990966,27.634211 L35.8871006,27.7097046 L35.7928932,27.7928932 L35.7097046,27.8871006 C35.4300985,28.2467008 35.4300985,28.7532992 35.7097046,29.1128994 L35.7928932,29.2071068 L38.585,32 L31,32 L30.8833789,32.0067277 C30.424297,32.0600494 30.0600494,32.424297 30.0067277,32.8833789 L30,33 L30.0067277,33.1166211 C30.0600494,33.575703 30.424297,33.9399506 30.8833789,33.9932723 L31,34 L38.585,34 L35.7928932,36.7928932 L35.7097046,36.8871006 C35.4046797,37.2793918 35.4324093,37.8466228 35.7928932,38.2071068 C36.1533772,38.5675907 36.7206082,38.5953203 37.1128994,38.2902954 L37.2071068,38.2071068 L41.7071068,33.7071068 L41.7577946,33.6525476 L41.8296331,33.5585106 L41.8751242,33.484277 L41.9063266,33.4232215 L41.9502619,33.3121425 L41.9725773,33.2335141 L41.9931674,33.1174626 L42,33 L41.997,32.924 L41.9798348,32.7992059 L41.9504533,32.6882636 L41.9287745,32.628664 L41.8753288,32.5159379 L41.8296215,32.441477 L41.787214,32.3832499 L41.7485042,32.336853 L41.7071068,32.2928932 L37.2071068,27.7928932 L37.1128994,27.7097046 C36.7892592,27.4580591 36.3465505,27.4328945 35.9990966,27.634211 Z"></path>
                                </g>
                            </g>
                        </svg>
                        {/* <img key={index+"img"}
                            src="https://www.iconpacks.net/icons/4/free-icon-open-folder-11477.png" alt='three-dots' 
                            height='22' style={{filter: "invert(100%)", height: "16px", padding: "0px 5px 0px 0px"}}
                            onClick={()=>{chatList[chat_id].showFolderDialog ^= true;}}
                            /> */}
                        <span key={index+"span"}
                            onChange={(event)=> handleChatNameUpdate(event, chat_id)} 
                            onKeyDown={(event)=> handleChatNameUpdate(event, chat_id)}
                            className="span" 
                            style={{
                                WebkitUserModify: (chatList[chat_id]?.showContentEdit)?"read-write":"read-only",
                                backgroundColor: (chatList[chat_id]?.showContentEdit)?"white":"inherit",
                                color: (chatList[chat_id]?.showContentEdit)?"black":"inherit"
                                }}>
                            {chatList[chat_id]?.name}
                        </span>
                    </span>

                    <span 
                        style={{minWidth: "20px",  display: chatList[chat_id].showThreeDots?"flex":"none", justifyContent:"center", padding: "0 .5em 0 .5em"}} 
                        onClick={() => {setOpenedDocId((x) => x?null:chat_id)}}
                        >
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
                                                    <path d="M16.729 4.271a1 1 0 0 0-1.414-.004 1.004 1.004 0 0 0-.225.355c-.832 1.736-1.748 2.715-2.904 3.293C10.889 8.555 9.4 9 7 9a1.006 1.006 0 0 0-.923.617 1.001 1.001 0 0 0 .217 1.09l3.243 3.243L5 20l6.05-4.537 3.242 3.242a.975.975 0 0 0 .326.217c.122.051.252.078.382.078s.26-.027.382-.078A.996.996 0 0 0 16 18c0-2.4.444-3.889 1.083-5.166.577-1.156 1.556-2.072 3.293-2.904a.983.983 0 0 0 .354-.225 1 1 0 0 0-.004-1.414l-3.997-4.02z" fill="#fff" className="color000 svgShape"></path>
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
                        <option disabled defaultValue={"--folder--"} selected value>--folder--</option>
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
                <span 
                    style={{fontWeight: '600', fontColor: 'white', textDecoration: 'underline', cursor: 'pointer'}}
                    onClick={(e) => handleResetPassword(e)}>
                    Reset Password
                </span>
                <label htmlFor="name">Name</label>
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
                    <h1 className="flexTextNormal">{(defaultDoc && defaultDoc?.name) || `GPT-4` }</h1>
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
                                <ol className="ol">
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
                                <ol className="ol">
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
                                <ol className="ol">
                                    {forceChatList^(!forceChatList) && allChats}
                                </ol>
                            </div>
                        </div>
                    </div>
                    <div className="absolute" style={{display: quickContextVisibility?"inline":"none", bottom:"0rem", marginBottom:"7.2rem"}}>
                        <nav role="none" className="shortDialog" >
                            <span onClick={handleSaveContext} className="py-3 transitionColors" id="headlessui-menu-item-:r2u:" role="menuitem" tabIndex="-1" >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                Save Context
                            </span>
                            <span href="#" as="button" className="py-3 transitionColors gap-3" id="headlessui-menu-item-:r30:" role="menuitem" tabIndex="-1" >
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
                                <a as="a" href="#faq" target="_blank" className="py-3 transitionColors" id="headlessui-menu-item-:r2u:" role="menuitem" tabIndex="-1" >
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Help &amp; FAQ
                                </a>
                                <span href="#" as="button" className="py-3 transitionColors" id="headlessui-menu-item-:r30:" role="menuitem" tabIndex="-1" onClick={handleSettingsOpen} >
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    Settings
                                </span>
                                <span href="#" as="button" className="py-3 transitionColors gap-3" role="menuitem" tabIndex="-1" onClick={handleLogout}>
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Log out
                                </span>
                            </nav>
                        </div>

                        <div className="groupRelative py-3">
                            <button className="w-full" onClick={handleOpenDialog} id="headlessui-menu-button-:r7:" type="button" aria-haspopup="true" aria-expanded="false">
                                <div className="-ml-0.5">
                                    <div className="relativeFlex">
                                        <span className="accountSpan">
                                            <span className="imageSpan">
                                                <img alt="" aria-hidden="true" src="data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%2720%27%20height=%2720%27/%3e" />
                                            </span>
                                                <img className="profileImage rounded-sm" alt="User"
                                                height="40px"
                                                src="https://images.unsplash.com/photo-1605106901227-991bd663255c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHNxdWFyZSUyMGRwfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60" decoding="async" data-nimg="intrinsic"
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
                        showStopGen={showStopGen}
                        handleStopGen={handleStopGen}
                        />
                </div>
            </div>
        </div>
    )
}

export default Chat;