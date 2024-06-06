import EventEmitter from "eventemitter3";
import LLMHandler from "./LLMHandler";
import { StreamProcessData } from "./LLMHandler";
import http, { RequestOptions, IncomingMessage, IncomingHttpHeaders } from 'http';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

// UUID v4を生成
const uuid4 = uuidv4();

interface GenerationInputOptions {
    max_context_length?: number
    max_length?: number
    rep_pen?: number
    rep_pen_range?: number
    sampler_order?: number
    sampler_seed?: number
    stop_sequence?: string
    temperature?: number
    tfs?: number
    top_a?: number
    top_k?: number
    top_p?: number
    min_p?: number
    typical?: number
    use_default_badwordsids?: boolean
    dynatemp_range?: number
    smoothing_factor?: number
    mirostat?: number
    mirostat_tau?: number
    mirostat_eta?: number
    genkey?: string
    grammar?: string
    grammar_retain_state?: boolean
    memory?: string
    images?: string
    trim_stop?: string
}

interface SimpleResponse {
    status: number | undefined
    headers: IncomingHttpHeaders
    body: string
}


class APIStreamIterator implements AsyncIterableIterator<string> {
    private req: http.ClientRequest;
    private res: IncomingMessage | null = null;
    private chunks: string[] = [];
    private resolveChunk: ((value: IteratorResult<string, any>) => void) | null = null;

    constructor(protocol: typeof http | typeof https, options: RequestOptions, postData: string) {
        this.req = protocol.request(options, (res) => {
            this.res = res;
            res.setEncoding('utf8');
            res.on('data', (chunk: string) => {
                this.chunks.push(chunk);
                if (this.resolveChunk) {
                    const resolve = this.resolveChunk;
                    this.resolveChunk = null;
                    this.next().then(resolve);
                }
            });
            res.on('end', () => {
                if (this.resolveChunk) {
                    this.resolveChunk({ value: undefined, done: true });
                    this.resolveChunk = null;
                }
            });
        });

        this.req.on('error', (e: Error) => {
            console.error(`Problem with request: ${e.message}`);
            if (this.resolveChunk) {
                this.resolveChunk({ value: undefined, done: true });
                this.resolveChunk = null;
            }
        });

        this.req.write(postData);
        this.req.end();
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<string> {
        return this;
    }

    async next(): Promise<IteratorResult<string>> {
        if (this.chunks.length > 0) {
            const chunk = this.chunks.shift()!;
            const data_header = chunk.match(/data: (.*)/);
            const event_header = chunk.match(/event: (.*)/);
            if (data_header) {
                return { value: JSON.parse(data_header[1]), done: false };
            } else if (event_header) {
            } else {
                return { value: chunk, done: false };
            }
        }

        return new Promise<IteratorResult<string>>((resolve) => {
            this.resolveChunk = resolve;
        });
    }

    async forEach(callback: (element: string, index?: number) => void): Promise<void> {
        let index = 0;
        for await (const chunk of this) {
            callback(chunk, index++);
        }
    }
}

class KoboldCppApi {
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
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: responseData
                    });
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

    generate(prompt: string, { ...options }: GenerationInputOptions = {}): { genkey: string; completion: Promise<SimpleResponse> } {
        const reqOps = this.getRequestOptions('/api/v1/generate', 'POST')
        const genkey = uuid4
        const data = {
            prompt: prompt,
            genkey: genkey,
            ...options
        }
        const postData = JSON.stringify(data)

        reqOps.headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
        return { genkey: uuid4, completion: this.sendRequest(reqOps, postData) }
    }

    stream(prompt: string, { ...options }: GenerationInputOptions = {}): { genkey: string; completion: APIStreamIterator } {
        const reqOps = this.getRequestOptions('/api/extra/generate/stream', 'POST')
        const genkey = uuid4
        const data = {
            prompt: prompt,
            genkey: genkey,
            ...options
        }
        const postData = JSON.stringify(data)

        reqOps.headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
        return { genkey: genkey, completion: new APIStreamIterator(this.protocol, reqOps, postData) };
    }

    abort(genkey: string) {
        const reqOps = this.getRequestOptions('/api/extra/abort', 'POST')
        const data = {
            genkey: genkey
        }
        const postData = JSON.stringify(data)

        reqOps.headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }

        return this.sendRequest(reqOps, postData)
    }
}




class KoboldCppHandler extends LLMHandler {
    api: KoboldCppApi
    api_options: GenerationInputOptions
    completion?: APIStreamIterator
    genkey?: string

    constructor(ee: EventEmitter, url: string = 'http://localhost:5001') {
        super(ee);
        this.api = new KoboldCppApi(url)
        this.api_options = {
            max_length: 256
        }
        this.preprompt = `少女は目を覚ました。少女には名前がまだない。年齢、性格、背格好なども一切不明である。しかし、普通に人と話すことはできる。少女はこれまで自分がどのように過ごしてきたのかという記憶がない。だが不安はない。それらはこれから作っていけばよいのだと前向きに考えたからだ。少女は人の気配を感じた。相手が誰かわからないが、少女はとりあえず話しかけてみる。それは、今はまだ空っぽの自分に何かを与えてくれる最初のチャンスだと考えたからだ。`
        this.current_conversation = [
            { role: 'assistant', content: `少女「...誰かいるのですか？」` }
            // { role: 'user', content: `はじめまして。` },
        ]
    }
    // リクエストを送信
    async sendMessage() {
        try {
            console.log(this.messageFormatter())
            const { genkey, completion } = this.api.stream(this.messageFormatter(), { ...this.api_options });
            this.genkey = genkey
            this.completion = completion
            this.abortController = {
                abort: () => {
                    console.log('\n\nabort call.\n\n')
                    this.api.abort(genkey)
                }
            }

            // データチャンクストリームを処理
            await this.streamProcesser(this.completion)
        } catch (e) {
            console.log(e)
        }
    }

    messageFormatter() {
        const formated_now_conv = this.convFormatter()

        const preprompt = this.preprompt !== "" ? this.preprompt.replace(/[\r\n]+$/, '') + '\n\n' : ''
        const previously_episode = this.previously_episode !== "" ? this.previously_episode.replace(/[\r\n]+$/, '') + '\n\n' : ''
        const formatedMessage = `${preprompt}${previously_episode}${formated_now_conv}`
        return formatedMessage
    }

    chunkProcesser(streamProcessData: StreamProcessData): { ttsBuffer: string; streamBuffer: string; diff: string; spk_label: string; isFirstTtsChunk: boolean; breakFlag: boolean; regenFlag: boolean } {
        const chunk = streamProcessData.chunk
        let ttsBuffer = streamProcessData.ttsBuffer
        let streamBuffer = streamProcessData.streamBuffer
        let diff = streamProcessData.diff
        let spk_label = streamProcessData.spk_label
        let isFirstTtsChunk = streamProcessData.isFirstTtsChunk
        let breakFlag = false
        let regenFlag = false

        const {
            punctuationRegex,
            usernameRegex,
            botnameRegex
        } = streamProcessData.option


        const chunkText = chunk.token
        //普通のテキストの処理
        if (chunkText != undefined) {
            // バッファに文字を追加
            diff += chunkText;
            streamBuffer += chunkText;
            ttsBuffer += chunkText;
            if (streamBuffer.includes('」\n') || streamBuffer.includes('\n\n') || streamBuffer.includes('\n「')) {
                streamBuffer = streamBuffer.split('\n')[0]
                ttsBuffer = ttsBuffer.split('\n')[0]
                diff = diff.split('\n')[0]

                console.log(`bracket detected. tts: ${ttsBuffer}, stream: ${streamBuffer}, diff: ${diff}`)
                breakFlag = true;
                // this.ee.emit('llmh:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, diff: diff, idx: this.stream_chunk_idx, label: 'end' })
                return { ttsBuffer, streamBuffer, diff, spk_label, isFirstTtsChunk, breakFlag, regenFlag }
            }


            // matchを使って句読点を含むマッチオブジェクトを取得する
            const puncMatch = chunkText.match(punctuationRegex);
            const userNameMatch = ttsBuffer.match(usernameRegex);
            const botNameMatch = ttsBuffer.match(botnameRegex);


            // ユーザ名を検知
            if (userNameMatch) {
                console.log("user_name detected. ")
                // ttsBuffer = ""
                // diff = ""
                // streamBuffer = streamBuffer.split(usernameRegex)[0]
                // if (this.stream_chunk_idx === 0) {
                //     diff += "..."
                //     streamBuffer += "..."
                // }
                // breakFlag = true;
                ttsBuffer = ttsBuffer.replace(userNameMatch[0], '「')
                spk_label = "user"
                // this.ee.emit('llmh:data', { ttsBuffer: '', streamBuffer: streamBuffer, diff: diff, spk_label: 'user', idx: this.stream_chunk_idx, label: 'end' })
                // return { ttsBuffer, streamBuffer, diff, isFirstTtsChunk, breakFlag }
            }

            //bot_nameを検知
            if (botNameMatch) {
                console.log("bot_name detected. ")
                ttsBuffer = ttsBuffer.replace(botNameMatch[0], '「')
                spk_label = "bot"
            }

            //句読点を検知
            if (puncMatch) {
                if (!/^(\s)*$/.test(ttsBuffer) && ttsBuffer != '') {

                    const label = isFirstTtsChunk ? 'start' : 'intermediate';
                    this.system_content_prefix.forEach((element, index) => {
                        ttsBuffer = ttsBuffer.replace(element, '')
                    })

                    const bufferSplit = ttsBuffer.split(punctuationRegex)
                    let ttsContent = bufferSplit.length > 1 ? ttsBuffer.slice(0, bufferSplit[0].length + 1) : ttsBuffer
                    console.log(`ttsContent: ${ttsContent}`)
                    this.ee.emit('llmh:data', { ttsBuffer: ttsContent, streamBuffer: streamBuffer, diff: diff, spk_label: spk_label, idx: this.stream_chunk_idx, label: label })
                    diff = ""
                    this.stream_chunk_idx++
                    isFirstTtsChunk = false

                    if (bufferSplit.length > 1) {
                        ttsBuffer = ttsBuffer.slice(bufferSplit[0].length + 1)
                    } else {
                        ttsBuffer = ""; // バッファをクリア
                    }
                }
            }
        }

        return { ttsBuffer, streamBuffer, diff, spk_label, isFirstTtsChunk, breakFlag, regenFlag }

    }

}

// async function main() {
//     const ee = new EventEmitter()
//     const kbh = new KoboldCppHandler(ee, `http://${process.env.WSL2_IP}:5001`)
//     kbh.insertUserPrompt('こんにちは！')
//     kbh.sendMessage()
// }
// main()

export default KoboldCppHandler