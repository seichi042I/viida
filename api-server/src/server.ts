import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import ChatGPTHandler from './Modules/ChatGPTHandler.mts';
import EventEmitter from 'eventemitter3';

const options: https.ServerOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384'
};

const server = https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end('Hello, world!');
})

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  const ee = new EventEmitter()
  const cgpth = new ChatGPTHandler(ee)

  ws.on('message', (message: string) => {
    const data = JSON.parse(message)
    if (data['type'] === "user_prompt") {
      cgpth.insertUserPrompt(data['data'])
    }
    cgpth.sendMessage()
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });

  ee.on('cgpth:data', (event) => { ws.send(JSON.stringify(event)) })
});

server.listen(5000, () => {
  console.log('Server running on https://localhost');
});