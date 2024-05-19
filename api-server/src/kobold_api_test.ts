import http, { RequestOptions, IncomingMessage } from 'http';

interface Message {
    role: string;
    content: string;
}

interface PostData {
    messages: Message[];
    stream: boolean;
}

class StreamIterator implements AsyncIterableIterator<string> {
    private req: http.ClientRequest;
    private res: IncomingMessage | null = null;
    private chunks: string[] = [];
    private resolveChunk: ((value: IteratorResult<string, any>) => void) | null = null;

    constructor(options: RequestOptions, postData: PostData) {
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

    async forEach(callback: (element: string, index: number) => void): Promise<void> {
        let index = 0;
        for await (const chunk of this) {
            callback(chunk, index++);
        }
    }
}

const postData: PostData = {
    messages: [
        {
            role: "system",
            content: "You are a helpful assistant."
        },
        {
            role: "user",
            content: "小説家になろうというサイトに、オリジナルのライトノベルを書いて登校しようと思う。小説の冒頭を書いてください。"
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
    const streamIterator = new StreamIterator(options, postData);

    for await (const chunk of streamIterator) {
        console.log(chunk)
    }
    console.log('No more data in response.');
}

main().catch(console.error);

export { StreamIterator }; export type { PostData, RequestOptions };

