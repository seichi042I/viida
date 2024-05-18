const WebSocketConnection = (hosts:Array<string>):Promise<WebSocket> => {
    return new Promise((resolve,reject) => {

        const connectNext = () => {
            if(hosts.length === 0){
                reject(new Error('All WebSocket connections failed.'))
                return
            }

            const url = hosts.shift()!
            const socket = new WebSocket(url)

            socket.onopen = () => {
                resolve(socket);
            };
        
            socket.onerror = () => {
                console.warn(`WebSocket connection failed: ${url}`);
                connectNext();
            };
        }

        connectNext()
    })
}

export default WebSocketConnection