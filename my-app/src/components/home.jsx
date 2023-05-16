import React from "react";
import Landing from "../components/landing";
import Chat from "../components/chat";

function Home() {
    const verified = true;
    
    if(verified)
        return <Chat />;
    else
        return <Landing />;
}

export default Home;