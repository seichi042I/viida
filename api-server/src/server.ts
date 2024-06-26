import http from 'http';
import https from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import ChatGPTHandler from './Modules/LLMHanders/ChatGPTHandler';
import EventEmitter from 'eventemitter3';
import KoboldCppHandler from './Modules/LLMHanders/KoboldCppHandler';
import SBV2Api from './Modules/sbv2_api_test';
import OllamaHandler from './Modules/LLMHanders/OllamaHandler';

// HTTPSサーバのオプション
// const httpsOptions: https.ServerOptions = {
//   key: fs.readFileSync('server.key'),
//   cert: fs.readFileSync('server.crt'),
//   minVersion: 'TLSv1.2',
//   maxVersion: 'TLSv1.3',
//   ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384'
// };

// HTTPSサーバの作成
// const httpsServer = https.createServer(httpsOptions, (req, res) => {
//   res.writeHead(200);
//   res.end('Hello, world! (HTTPS)');
// });


// HTTPサーバの作成
const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello, world! (HTTP)');
});


// WebSocketサーバの作成と設定
const setupWebSocketServer = (server: any) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    const ee = new EventEmitter();
    const cgpth = new ChatGPTHandler(ee);
    const kbh = new KoboldCppHandler(ee, `http://${process.env.WSL2_IP}:5001`)
    const ollh = new OllamaHandler('ninja-v1-NSFW-128k:latest', ee,)
    const llmh = ollh   //テストのため直接指定
    const sbv2 = new SBV2Api('http://sbv2:5000')
    // llmh.sendMessage();

    ws.on('message', (message: string) => {
      const data = JSON.parse(message);
      if (data['type'] === "user_prompt") {
        if (data['data'] !== '') {
          llmh.insertUserPrompt(data['data']);

          ws.send(JSON.stringify({ diff: `${kbh.character_sheets['user'].display_name}「${data['data']}」\n` }))
        } else {
        }
      }
      llmh.sendMessage();
    });

    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });

    ee.on('llmh:data', (event) => { ws.send(JSON.stringify(event)) });
  });
};

// HTTPおよびHTTPSサーバにWebSocketサーバを設定
setupWebSocketServer(httpServer);
// setupWebSocketServer(httpsServer);

// サーバの起動
httpServer.listen(5000, () => {
  console.log('HTTP Server running on http://localhost:5000');
});

// httpsServer.listen(5001, () => {
//   console.log('HTTPS Server running on https://localhost:5001');
// });