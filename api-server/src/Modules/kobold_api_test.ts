import http, { RequestOptions, IncomingMessage } from 'http';

interface GenerationInput {
    prompt: string
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

interface KoboldCppPostData {
    model_name: string;
    request_body: GenerationInput[];
    stream: boolean;
}

class KoboldAPIStreamIterator implements AsyncIterableIterator<string> {
    private req: http.ClientRequest;
    private res: IncomingMessage | null = null;
    private chunks: string[] = [];
    private resolveChunk: ((value: IteratorResult<string, any>) => void) | null = null;

    constructor(options: RequestOptions, postData: KoboldCppPostData | any) {
        this.req = http.request(options, (res) => {
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

        this.req.write(JSON.stringify(postData));
        this.req.end();
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<string> {
        return this;
    }

    async next(): Promise<IteratorResult<string>> {
        if (this.chunks.length > 0) {
            const chunk = this.chunks.shift()!;
            const match = chunk.match(/data: (.*)/);
            if (match) {
                return { value: JSON.parse(match[1]), done: false };
            }
            return { value: JSON.parse(chunk), done: false };
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

const postData = {
    messages: [
        {
            role: "system",
            content: "You are a helpful assistant."
        },
        {
            role: "user",
            content: "小説家になろうというサイトに、オリジナルのライトノベルを書いて投稿しようと思う。小説の冒頭を書いてください。"
        }
    ],
    stream: true
};

const options: RequestOptions = {
    hostname: 'localhost',
    port: 5001,
    path: '/v1/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(postData))
    }
};

async function main() {
    const streamIterator = new KoboldAPIStreamIterator(options, postData);

    for await (const chunk of streamIterator) {
        console.log(chunk)
    }
    console.log('No more data in response.');
}

main().catch(console.error);

export { KoboldAPIStreamIterator as StreamIterator }; export type { KoboldCppPostData as PostData, RequestOptions };

