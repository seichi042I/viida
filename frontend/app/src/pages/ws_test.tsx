import React from "react";

const WSTest = () => {
    const socket = new WebSocket('wss://localhost:5000');
    // const [serverMSG,setServerMSG] = useState()
    socket.addEventListener('open', (event: Event) => {
      console.log('WebSocket connected');
      socket.send('Hello, server!');
    });
    
    socket.addEventListener('message', (event: MessageEvent) => {
      console.log(`Received message: ${event.data}`);

    });
    
    socket.addEventListener('close', (event: CloseEvent) => {
      console.log('WebSocket disconnected');
    });

    return (
        <div>
            WebSocket Test.
        </div>
        )
}

export default WSTest