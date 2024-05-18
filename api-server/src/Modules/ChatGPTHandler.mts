import EventEmitter from "eventemitter3";
// OpenAI
import OpenAI from "openai"
import { ChatCompletionStream } from "openai/lib/ChatCompletionStream";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,// ファイルから読み込み
});
const MODEL_NAME = "gpt-4o-2024-05-13"
const PREPROMPT = "少女は目を覚ました。少女には名前がまだない。年齢、性格、背格好なども一切不明である。しかし、普通に人と話すことはできる。少女はこれまで自分がどのように過ごしてきたのかという記憶がない。だが不安はない。それらはこれから作っていけばよいのだと前向きに考えたからだ。少女は人の気配を感じた。相手が誰かわからないが、少女はとりあえず話しかけてみる。それは、今はまだ空っぽの自分に何かを与えてくれる最初のチャンスだと考えたからだ。"


class ChatGPTHandler {
    model_name: string
    preprompt: string
    previously_on_conversation: string
    current_conversation: Array<{ "role": string, "content": string }>
    ee: EventEmitter
    abortController?: AbortController
    prev_request_time: number
    stream_chunk_idx: number
    user_name: string
    bot_name: string
    revision_grace_period: number
    completion?: ChatCompletionStream

    constructor(
        ee: EventEmitter,
        model_name = MODEL_NAME,
        preprompt = PREPROMPT,
    ) {
        this.model_name = model_name
        this.preprompt = preprompt
        this.previously_on_conversation = ""
        this.current_conversation = []
        this.ee = ee
        this.abortController = undefined
        this.prev_request_time = Date.now()
        this.stream_chunk_idx = 0
        this.user_name = "ユーザ"
        this.bot_name = "少女"

        // 言い直しと見なす猶予時間
        this.revision_grace_period = 2000
    }

    insertSystemPrompt(system_prompt: string) {
        if (system_prompt == '') { return }
        this.current_conversation.push({ "role": "system", "content": `${system_prompt}` })
    }

    /**
     * 会話履歴にユーザプロンプトを追加する
     * @param {string} ユーザの発言内容
     */
    insertUserPrompt(user_prompt: string) {
        if (user_prompt == '') { return }

        // 前のストリームがまだつづいていたら中断
        if (this.abortController) { this.abortController.abort() }

        // 現在時刻をフォーマット済みの文字列で取得
        const nowText = this.getDateNowText()

        // フォーマット
        let content = `${user_prompt}`

        // 言い直し猶予時間内であれば上書き
        const interval = Date.now() - this.prev_request_time
        if (interval < this.revision_grace_period) {
            // 前回の発言を取得
            let prevUtterance: { "role": string, "content": string } = this.current_conversation.pop() || { role: '', content: '' }

            const role = prevUtterance.role
            //前回の発言がassistantの場合もう一つ前の発言を取得
            if (role == "assistant") {
                prevUtterance = this.current_conversation.pop() || { role: '', content: '' }
            }

            //取得したものが事前プロンプトだった場合、元に戻す
            if (this.current_conversation.length === 0) {
                if (role == 'system') {
                    this.current_conversation.push(prevUtterance)
                } else {
                    this.current_conversation = [{ role: "system", content: this.preprompt }]
                }
            }


            this.current_conversation.pop()
            content = `${this.user_name}「${user_prompt}」`
        }

        // 会話に追加
        this.current_conversation.push({ role: "system", content: `now:${nowText}` })
        this.current_conversation.push({ role: "user", content: content })
        this.prev_request_time = Date.now()

        // 指定数以上の要素数だった場合は、先頭からrole:userまで削除
        if (this.current_conversation.length > 15) {
            while (this.current_conversation.length > 0) {
                let utterance = this.current_conversation.shift();
                if (utterance) {
                    let role = utterance.role;
                    console.log(role);
                    if (role === "user") {
                        break;
                    }
                }
            }
        }
    }

    // ChatGPTにリクエストを送信
    async sendMessage() {

        //GPTにリクエスト送信
        this.abortController = new AbortController();
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: "あなたは優秀なライトノベル作家です。想像力を働かせて、以下の小説の文章に続くように書いてください。必ず与えられた文章の続きから書くようにしてください。文章の重複は許されません。" }, // 全体的、絶対的な支持
            { role: 'user', content: this.messageFormatter() }
        ]
        console.log(messages)
        try {
            this.completion = openai.beta.chat.completions.stream(
                {
                    model: this.model_name,
                    messages: messages,
                    stream: true
                },
                { signal: this.abortController.signal }
            );

            // データチャンクストリームを処理
            await this.streamProcesser(this.completion)
        } catch (e) {
            console.log(e)
        }
    }

    messageFormatter() {
        const DEFAULT_ACTION = [
            { "action": "同意", "desc": "短い同意を示す", "prior": 0.1 },
            { "action": "回答", "desc": "客観的な事実を回答し、主観的な感想を添えて会話を広げる", "prior": 0.1 },
            { "action": "評価", "desc": "主観的な意見を述べる", "prior": 0.1 },
            { "action": "質問", "desc": "短く質問する", "prior": 0.1 },
            { "action": "質問2", "desc": "脱線する質問をする", "prior": 0.1 },
            { "action": "相槌1", "desc": "「ええ」「はい」などの短い丁寧な相槌をする", "prior": 0.2 },
        ]
        function toMarkDown(actionArray: Array<{ action: string, desc: string, prior: number }>) {
            let markdown = '## Action list\n'
            for (const [idx, item] of actionArray.entries()) {
                const action = item.action
                const description = item.desc
                const probability = item.prior * 100
                markdown += `${idx}. ${action}:${description}\n`
            }
            return markdown
        }
        const actions = toMarkDown(DEFAULT_ACTION)
        const formated_now_conv = this.convFormatter()

        // const instruction = `以下の小説の続きを書きなさい。`

        const formatedMessage = `${this.preprompt}\n\n${this.previously_on_conversation}\n${formated_now_conv}${this.bot_name}「 `
        // console.log(formatedMessage.replace('{{user_name}}', this.user_name))
        return formatedMessage.replace('{{user_name}}', this.user_name)
    }

    convFormatter() {
        let conv_log = ""
        let conv_list = this.current_conversation || []

        try {
            let date = ""
            for (const [idx, item] of conv_list.entries()) {
                const role = item.role
                const content = item.content

                if (role == "system") {
                    if (/now:/.test(content)) {
                        if (date != content) {
                            date = content
                            conv_log += `\n${content}\n`
                            continue
                        } else {
                            continue
                        }
                    }
                    conv_log += `${content}\n`
                }
                if (role == "user") {
                    conv_log += `${this.user_name}「${content}」\n`
                }
                if (role == "assistant") {
                    const bracket_idx = content.indexOf('「')
                    conv_log += `${this.bot_name}「${content.substring(bracket_idx)}」\n`
                }
            }
            return conv_log
        } catch (e) {
            console.log(e)
            return conv_log
        }
    }
    async function_calling(messages: any) {
        console.log(messages)
        const tools: OpenAI.ChatCompletionTool[] = [
            {
                "type": "function",
                "function": {
                    "name": "setUserName",
                    "description": "Storing usernames in the database",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "user name",
                            },
                        },
                        "required": ["name"],
                    },
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "getCalendarEvents",
                    "description": "Function to fetch events within a specified period",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "timeMin": {
                                "type": "string",
                                "description": "the start time of the period for retrieving calendar events. It is ISOString format. Time zone is should be Tokyo, Japan.",
                            },
                            "timeMax": {
                                "type": "string",
                                "description": "the end time of the period for retrieving calendar events It is ISOString format. Time zone is should be Tokyo, Japan.",
                            },
                        },
                        "required": ["timeMin", "timeMax"],
                    },
                }
            }
        ];
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });

        console.log(response)
        console.log(response.choices[0].message)
        const tool_calls = response.choices[0].message.tool_calls
        if (tool_calls) {
            const func = tool_calls[0].function
            console.log(func.name)
            console.log(JSON.parse(func.arguments))
            this.ee.emit('cgpth:function_calling', { function_name: func.name, arguments: JSON.parse(func.arguments) })
        }

    }

    async streamProcesser(completion?: ChatCompletionStream) {
        if (completion === undefined) return
        let ttsBuffer = ""
        let streamBuffer = ""
        let isFirstTtsChunk = true

        try {
            this.stream_chunk_idx = 0
            for await (const chunk of completion) {
                if (chunk == undefined) { continue }

                const chunkText = chunk.choices[0].delta.content
                if (chunkText != undefined) {
                    if (chunkText.includes('」')) {
                        this.abortController?.abort()
                        break;
                    }
                    // バッファに文字を追加
                    streamBuffer += chunkText;
                    ttsBuffer += chunkText;

                    // 正規表現を用いて句読点を見つける
                    const punctuationRegex = /([\/#!$%\^&\*;:{}=\-_`~()？！、。」])/;
                    const usernameRegex = new RegExp(`${this.user_name}「`);
                    const botnameRegex = new RegExp(`${this.bot_name}「`);

                    // matchを使って句読点を含むマッチオブジェクトを取得する
                    const puncMatch = chunkText.match(punctuationRegex);
                    const userNameMatch = ttsBuffer.match(usernameRegex);
                    const botNameMatch = ttsBuffer.match(botnameRegex);


                    // マッチしたらイベントを発火する
                    if (userNameMatch) {
                        this.abortController?.abort()
                        this.ee.emit('cgpth:data', { ttsBuffer: '。', streamBuffer: streamBuffer, idx: this.stream_chunk_idx, label: 'end' })
                    }
                    if (botNameMatch) {
                        ttsBuffer = ttsBuffer.replace(botNameMatch[0], '')
                        streamBuffer = streamBuffer.replace(botNameMatch[0], '')
                    }
                    console.log(ttsBuffer)
                    if (puncMatch) {
                        if (!/^(\s)*$/.test(ttsBuffer) && ttsBuffer != '') {

                            const label = isFirstTtsChunk ? 'start' : 'intermediate';
                            this.ee.emit('cgpth:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, idx: this.stream_chunk_idx, label: label })
                            this.stream_chunk_idx++
                            isFirstTtsChunk = false
                        }
                        ttsBuffer = ""; // バッファをクリア
                    }
                }
            }

            // 最後のデータを処理
            if (!/^(\s)*$/.test(ttsBuffer) && ttsBuffer != '') {
                this.ee.emit('cgpth:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, idx: this.stream_chunk_idx, label: 'end' })
            }
            if (streamBuffer != '') {
                const lastUtt = this.current_conversation.pop()
                if (lastUtt) {
                    if (lastUtt.role != 'assistant') {
                        this.current_conversation.push(lastUtt)
                    }
                }
                this.current_conversation.push({ role: "assistant", content: streamBuffer })
            }
        } catch (e: any) {
            // 中断された場合、重複を回避してassistantの発言を会話履歴に追加する
            if (e.name === 'AbortError') {
                if (streamBuffer != '') {
                    const lastUtt = this.current_conversation.pop() || { role: "", content: "" }
                    if (lastUtt.role != 'assistant') {
                        this.current_conversation.push(lastUtt)
                    }
                    this.current_conversation.push({ role: "assistant", content: streamBuffer })
                }
            } else {
                console.error('Stream reading error:', e);
            }
        }

        return streamBuffer
    }

    getDateNowText() {
        // 曜日の名前を格納した配列
        const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

        // 現在時刻を取得
        const current = Date.now()
        const currentDate = new Date(current + 9 * 60 * 60 * 1000);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const hour = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();
        const milliseconds = currentDate.getMilliseconds();
        const secondsWithMilliseconds = seconds + (milliseconds / 1000);
        const roundedSeconds = Math.round(secondsWithMilliseconds * 100) / 100;
        const dayOfWeekName = DAYS[currentDate.getDay()]

        // 2ちゃんねる風に整形
        return `${year}/${month}/${day}(${dayOfWeekName}) ${hour}:${minutes}:${roundedSeconds}`
    }

    resetConversation() {
        this.current_conversation = []
        this.previously_on_conversation = ""
    }

    getNUserUtterance(n: number, { with_system_prompt = false } = {}) {
        // ユーザの発言をn個取得
        let user_utt_buff = []
        let count = -1
        try {
            while (user_utt_buff.length <= n) {
                const utt = this.current_conversation[this.current_conversation.length + count]
                if (utt.role == 'user') {
                    user_utt_buff.unshift(utt)
                }
                if (user_utt_buff.length > 0 && with_system_prompt && utt.role == 'system') {
                    user_utt_buff.unshift(utt)
                }
                count--
                if (-count >= this.current_conversation.length) {
                    break
                }
            }
            return user_utt_buff
        } catch (e) {
            console.log(e)
        }

        return []
    }

    async remindable() {
        const n_user_utt = this.getNUserUtterance(3)
        let n_user_utt_content: Array<string> = []
        for (const utt of n_user_utt) {
            n_user_utt_content.push(utt.content)
        }

        const taskString = `以下は${this.user_name}の直近の発言である。これらの発言内容から、${this.user_name}のためにリマインドを設定すべき状況か答えなさい。設定すべきなら「y」、すべきでないなら「n」と答えなさい\n${n_user_utt_content.join("\n")}`
        console.log(taskString)
        return this.YesNoTask(taskString)
    }
    async userNameExtract() {
        const last_user_utt = this.getNUserUtterance(1)[0]
        const taskString = `次に示す発言から{name: value}のJSON形式で発言者の名前を抽出せよ。”あの人は〜”や”〜ってばなんなのよ”など、発言者自身の名前でない場合はnullにせよ。答えのみ書け
        
        ${last_user_utt}
        `
        const message: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: taskString }]
        try {
            const completion = await openai.chat.completions.create(
                {
                    model: 'gpt-4-0125-preview',
                    messages: message,
                    temperature: 0
                },
            );
            const response_message = completion.choices[0].message
            const response_content = response_message.content
            return response_content
        } catch (e) {
            console.log(e)
        }
        return
    }

    async YesNoTask(taskString: string) {
        const message: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: taskString }]
        try {
            const completion = await openai.chat.completions.create(
                {
                    model: 'gpt-3.5-turbo-1106',
                    messages: message,
                    temperature: 0
                },
            );
            const response_message = await completion.choices[0].message
            const response_content = response_message.content
            const result = response_content == 'y' ? true : false
            return result
        } catch (e) {
            console.log(e)
        }

        return false
    }
}

export default ChatGPTHandler