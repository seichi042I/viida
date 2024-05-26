import http, { RequestOptions, IncomingMessage, IncomingHttpHeaders } from 'http';
import https from 'https';
import { URLSearchParams } from 'url';
import EventEmitter from "eventemitter3";

interface SimpleResponse {
    status: number | undefined
    headers: IncomingHttpHeaders
    body: string | ArrayBuffer
}

interface SBV2TTSOptions {
    model_id?: string
    speaker_name?: string
    speaker_id?: number
    style?: string
    style_weight?: number
}

class SBV2Api {
    host: string
    port: string | number
    protocol: typeof http | typeof https

    constructor(url: string) {
        const parsedURL = new URL(url)
        this.host = parsedURL.hostname
        this.port = parsedURL.port
        this.protocol = parsedURL.protocol === 'https:' ? https : http;
    }

    getRequestOptions(path: string, method: 'POST' | 'GET'): RequestOptions {
        return {
            hostname: this.host,
            port: this.port,
            path: path,
            method: method,

        };
    }

    sendRequest(options: RequestOptions, postData: string): Promise<SimpleResponse> {
        return new Promise((resolve, reject) => {

            const req = this.protocol.request(options, (res) => {
                let responseData = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.headers['content-type'] == 'audio/wav') {
                        // 文字列をBufferに変換
                        const buffer = Buffer.from(responseData, 'binary');

                        // BufferをArrayBufferに変換
                        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            body: arrayBuffer
                        });
                    } else {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            body: responseData
                        });
                    }
                });
            });

            req.on('error', (e) => {
                reject(`Problem with request: ${e.message}`);
            });

            // POSTデータを送信
            if (options.method === 'POST') {
                req.write(postData);
            }
            // リクエストを終了
            req.end();
        });
    }

    async generate(text: string, { ...options }: SBV2TTSOptions = {}): Promise<ArrayBuffer> {
        console.log("sbv2 generate")
        const data = {
            text: text,
            ...options
        }
        const stringParams = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)])
        );
        const querystrings = new URLSearchParams(stringParams).toString()
        const reqOps = this.getRequestOptions(`/voice?${querystrings}`, 'GET')
        const postData = JSON.stringify(data)

        reqOps.headers = {
            'Content-Type': 'audio/wav',
            'Content-Length': Buffer.byteLength(postData)
        }
        const response = await this.sendRequest(reqOps, postData)
        return response.body as ArrayBuffer
    }
}

export default SBV2Api