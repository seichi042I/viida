import WebSocketConnection from '@/Components/Atoms/logic/WebSocketConnection';
import { EventEmitter } from 'eventemitter3';

const exitcode2reason: {
    [key: number]: string;
} = {
    1000: "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.",
    1001: "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.",
    1002: "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.",
    1003: "An endpoint is terminating the connection due to a protocol error",
    1004: "Reserved. The specific meaning might be defined in the future.",
    1005: "No status code was actually present.",
    1006: "The connection was closed abnormally, e.g., without sending or receiving a Close control frame",
    1007: "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [https://www.rfc-editor.org/rfc/rfc3629] data within a text message).",
    1008: "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.",
    1009: "An endpoint is terminating the connection because it has received a message that is too big for it to process.",
    1011: "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.",
    1015: "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified)."
}

class WebSocketHandler {
    ws!: WebSocket;
    ee: EventEmitter;

    constructor(ee: EventEmitter) {
        WebSocketConnection(ee, ['wss://vk3064zn-5000.asse.devtunnels.ms/', 'ws://vk3064zn-5000.asse.devtunnels.ms/', 'wss://localhost:5000']);
        this.ee = ee

        ee.on('wsc:onopen', socket => {
            this.ws = socket
            this.ws.onopen = (event) => this.onOpen(event);
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onclose = (event) => this.onClose(event);
        })
    }

    onOpen(event: Event) {
        console.log('WebSocket connected');
        this.ws.send(JSON.stringify({ type: "null", data: "" }))
        this.ee.emit('wsh:onopen', event)
    }

    onMessage(event: MessageEvent) {
        console.log(`Received message: ${event.data}`);
        this.ee.emit('wsh:onmessage', event)
    };

    onClose(event: CloseEvent) {
        this.exitLog(event)
        this.ee.emit('wsh:onclose', event)
    }

    exitLog(event: CloseEvent) {
        let reason;
        // See https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
        if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
            reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
        else if (exitcode2reason[event.code])
            reason = exitcode2reason[event.code]
        else
            reason = "Unknown reason";
        console.log("code: " + event.code + " , reason: " + reason)
    }

    sendMessage(type: string, data: any) {
        const message = {
            "type": type,
            "data": data
        }
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(message))
        } else {
            console.log("websocket alrady closed.")
        }
    }

}

export default WebSocketHandler