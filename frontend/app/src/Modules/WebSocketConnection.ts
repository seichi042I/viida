import { EventEmitter } from "eventemitter3"
const connectWithTimeout = (url: string, timeout: number = 5000): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);

    const timeoutId = setTimeout(() => {
      socket.close();
      reject(new Error('WebSocket connection timed out'));
    }, timeout);

    socket.onopen = () => {
      clearTimeout(timeoutId);
      resolve(socket);
    };

    socket.onerror = (err) => {
      clearTimeout(timeoutId);
      reject(err);
    };

    socket.onclose = () => {
      clearTimeout(timeoutId);
      reject(new Error('WebSocket connection closed'));
    };
  });
}


const WebSocketConnection = (ee: EventEmitter, hosts: Array<string>): void => {
  const connectNext = async () => {
    if (hosts.length === 0) {
      return
    }

    const url = hosts.shift()!
    try {
      const socket = await connectWithTimeout(url, 2000)
      ee.emit('wsc:onopen', socket)
    } catch (error) {
      console.warn(`WebSocket connection failed: ${url}`);
      connectNext();
    }
  }
  connectNext()
}

export default WebSocketConnection