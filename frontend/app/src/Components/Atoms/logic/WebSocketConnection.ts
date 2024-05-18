import { EventEmitter } from "eventemitter3"

const WebSocketConnection = (ee: EventEmitter, hosts: Array<string>): void => {
    const connectNext = () => {
        if (hosts.length === 0) {
            return
        }

        const url = hosts.shift()!
        const socket = new WebSocket(url)

        socket.onopen = () => {
            ee.emit('wsc:onopen', socket)
        };

        socket.onerror = () => {
            console.warn(`WebSocket connection failed: ${url}`);
            connectNext();
        };
    }
    connectNext()
}

export default WebSocketConnection