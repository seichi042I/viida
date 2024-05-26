import EventEmitter from "eventemitter3";
// OpenAI
import OpenAI from "openai"
import { ChatCompletionStream } from "openai/lib/ChatCompletionStream";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,// ファイルから読み込み
});
import { function_calling_tools } from './utils.mts'
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";
import CharacterSheets from "./CharacterSheet";

const MODEL_NAME = "gpt-4o-2024-05-13"
const PREPROMPT = "narration:少女は目を覚ました。少女には名前がまだない。年齢、性格、背格好なども一切不明である。しかし、普通に人と話すことはできる。少女はこれまで自分がどのように過ごしてきたのかという記憶がない。だが不安はない。それらはこれから作っていけばよいのだと前向きに考えたからだ。少女は人影を視界の端にとらえた。相手が誰かわからないが、少女はとりあえず話しかけてみる。それは、今はまだ空っぽの自分に何かを与えてくれる最初のチャンスだと考えたからだ。"

type FunctionDictionary = {
    [key: string]: (...args: any[]) => any;
};



class ChatGPTHandler {
    model_name: string
    preprompt: string
    previously_episode: string
    current_conversation: Array<{ "role": string, "content": string }>
    ee: EventEmitter
    abortController?: AbortController
    prev_request_time: number
    stream_chunk_idx: number
    character_sheets: CharacterSheets
    system_content_prefix: Array<string>
    revision_grace_period: number
    completion?: ChatCompletionStream
    tools_dict: FunctionDictionary

    constructor(
        ee: EventEmitter,
        model_name = MODEL_NAME,
        preprompt = PREPROMPT,
    ) {
        this.model_name = model_name
        this.preprompt = preprompt
        this.previously_episode = ""
        this.current_conversation = []
        this.ee = ee
        this.abortController = undefined
        this.prev_request_time = Date.now()
        this.stream_chunk_idx = 0
        this.character_sheets = new CharacterSheets({ user: { initial_label: "user" }, bot: { initial_label: "少女" } })
        this.system_content_prefix = ['narration:']
        this.tools_dict = { "updateCharacterName": (args) => this.updateCharacterName(args) }


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
            content = `${this.character_sheets['user'].display_name}「${user_prompt}」`
        }

        // 時刻の分が変わっていたら新しく時刻情報を挿入
        const prevDate = new Date(this.prev_request_time)
        const currentDate = new Date(Date.now())
        const prev_hours = prevDate.getHours()
        const prev_minutes = prevDate.getMinutes()
        const current_hours = currentDate.getHours()
        const current_minutes = currentDate.getMinutes()
        if (prev_hours === current_hours && prev_minutes === current_minutes) {
            this.current_conversation.push({ role: "system", content: `now:${nowText}` })
        }
        // 会話に追加
        this.current_conversation.push({ role: "user", content: content })
        this.prev_request_time = Date.now()

        // 指定数以上の要素数だった場合は、先頭からrole:userまで削除
        if (this.current_conversation.length > 30) {
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
            { role: 'system', content: `あなたは優秀なライトノベル作家です。あなたは今からは、${this.character_sheets['user'].display_name}の発言内容を物語のキャラクターのセリフとして考え、話がつながるように物語を展開して書いていきます。セリフを書くときは'${this.character_sheets['bot'].display_name}「（発言内容）」'のように、必ず発言者の名前を鍵括弧の前に書きます。『${this.character_sheets['user'].display_name}』の発言内容はあなた以外の人が考えるので、あなたは『${this.character_sheets['bot'].display_name}』の発言とストーリーのみ考えて書いてください。` }, // 全体的、絶対的な支持
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
        const formated_now_conv = this.convFormatter()

        const formatedMessage = `${this.previously_episode}${formated_now_conv}`
        return formatedMessage.replace('{{user_name}}', this.character_sheets['user'].display_name)
    }

    convFormatter() {
        let conv_log = ""
        let conv_list = this.current_conversation || []

        try {
            let date = ""
            for (const [idx, item] of conv_list.entries()) {
                const role = item.role
                const content = item.content
                console.log(`role: ${role}, content: ${content}`)

                if (role == "system") {
                    if (!/^(\s)*$/.test(content) && content != '') {
                        if (/now:/.test(content)) {
                            //時刻を挿入
                            if (date != content) {
                                date = content
                                // conv_log += `\n${content}\n`
                                continue
                            } else {
                                continue
                            }
                        } else if ('narration:' === content) {
                            conv_log += content
                        } else {
                            conv_log += `${content}\n`
                        }
                    }
                }

                // ユーザの発言を挿入
                if (role == "user") {
                    conv_log += `${this.character_sheets['user'].display_name}「${content}」\n`
                }

                //botの発言を挿入
                if (role == "assistant") {
                    // const bracket_idx = content.indexOf('「')
                    // conv_log += `${content.substring(bracket_idx)}\n`
                    conv_log += `${content}\n`
                }
            }
            return conv_log
        } catch (e) {
            console.log(e)
            return conv_log
        }
    }


    async function_calling(messages: any, force_call_tool_name?: string) {
        console.log(`\n\nat function_calling method: messages:${JSON.stringify(messages)}\n\n`)
        let options: ChatCompletionCreateParamsNonStreaming = {
            model: MODEL_NAME,
            messages: messages,
            tools: function_calling_tools,
            tool_choice: "auto",
        }
        if (force_call_tool_name) {
            options.tool_choice = { "type": "function", "function": { "name": force_call_tool_name } }
        }

        const response = await openai.chat.completions.create(options);
        console.log(`at function_calling method: response: ${JSON.stringify(response)}`)
        const tool_calls = response.choices[0].message.tool_calls
        if (tool_calls) {
            const func = tool_calls[0].function
            const args = JSON.parse(func.arguments)
            console.log(func.name)
            console.log(args)
            this.ee.emit('cgpth:function_calling', { function_name: func.name, arguments: args })//イベント発火
            this.tools_dict[func.name](args)//関数実行
        }

    }


    generatedTextPusher = (streamBuffer: string) => {
        console.log(streamBuffer)
        if (streamBuffer != '') {
            const lastUtt = this.current_conversation.slice(-1)[0]
            if (lastUtt) {
                if (lastUtt.role === 'assistant') {
                    this.current_conversation.splice(-1, 1)
                }
                if (lastUtt.role === 'system' && lastUtt.content === 'narration:') {
                    this.current_conversation.splice(-1, 1)
                }
            }
            console.log(JSON.stringify(this.current_conversation))

            // セリフとその他に分割して保存
            const bot_name_split = streamBuffer.split(`${this.character_sheets['bot'].display_name}「`)
            if (bot_name_split.length > 1) {
                bot_name_split.forEach((element, index) => {
                    const bracket_split = element.split('」')
                    if (bracket_split.length > 1) {
                        console.log("セリフ:", element);
                        this.current_conversation.push({ role: "assistant", content: `${this.character_sheets['bot'].display_name}「${bracket_split[0].replace('\n', '')}」` })
                        if (bracket_split[1] !== '') {
                            this.current_conversation.push({ role: "system", content: bracket_split[1].replace('\n', '') })
                        }

                    } else if (!/^(\s)*$/.test(element) && element != '') {
                        // 通常の要素に対する処理
                        let fixed_content = element
                        console.log("その他:", fixed_content);
                        this.current_conversation.push({ role: "system", content: fixed_content.replace('\n', '') })
                    }
                })
            } else if (!/^(\s)*$/.test(streamBuffer) && streamBuffer != '') {
                console.log("その他:", streamBuffer);
                this.current_conversation.push({ role: "system", content: streamBuffer.replace('\n', '') })
            }
            streamBuffer = ''
        }
    }

    async streamProcesser(completion?: ChatCompletionStream) {
        if (completion === undefined) return
        let diff = ""
        let ttsBuffer = ""
        let streamBuffer = ""
        let isFirstTtsChunk = true

        // 正規表現を用いて句読点などを
        const punctuationRegex = /([\/#!$%\^&\*;:{}=\-_`~()？！、。」])/;
        const usernameRegex = new RegExp(`${this.character_sheets['user'].display_name}「`);
        const botnameRegex = new RegExp(`${this.character_sheets['bot'].display_name}「`);

        // ストリーミング処理
        try {
            this.stream_chunk_idx = 0
            for await (const chunk of completion) {
                if (chunk == undefined) { continue }

                const chunkToolCalls = chunk.choices[0].delta.tool_calls
                const chunkText = chunk.choices[0].delta.content
                // function callingの処理
                if (chunkToolCalls) {
                    console.log(JSON.stringify(chunkToolCalls))
                } else {
                    //普通のテキストの処理
                    if (chunkText != undefined) {
                        // バッファに文字を追加
                        streamBuffer += chunkText;
                        ttsBuffer += chunkText;
                        diff += chunkText;
                        if (streamBuffer.includes('」\n') || streamBuffer.includes('\n\n') || streamBuffer.includes('\n「')) {
                            streamBuffer = streamBuffer.split('\n')[0]
                            ttsBuffer = ttsBuffer.split('\n')[0]
                            diff = diff.split('\n')[0]

                            console.log(`bracket detected. tts: ${ttsBuffer}, stream: ${streamBuffer}, diff: ${diff}`)
                            break;
                        }


                        // matchを使って句読点を含むマッチオブジェクトを取得する
                        const puncMatch = chunkText.match(punctuationRegex);
                        const userNameMatch = ttsBuffer.match(usernameRegex);
                        const botNameMatch = ttsBuffer.match(botnameRegex);


                        // ユーザ名を検知
                        if (userNameMatch) {
                            this.ee.emit('llmh:data', { ttsBuffer: '', streamBuffer: streamBuffer, duff: '', idx: this.stream_chunk_idx, label: 'end' })
                            break;
                        }

                        //bot_nameを検知
                        if (botNameMatch) {
                            console.log("bot_name detected. ")
                            ttsBuffer = ttsBuffer.replace(botNameMatch[0], '「')
                        }

                        //句読点を検知
                        if (puncMatch) {
                            if (!/^(\s)*$/.test(ttsBuffer) && ttsBuffer != '') {

                                const label = isFirstTtsChunk ? 'start' : 'intermediate';
                                this.system_content_prefix.forEach((element, index) => {
                                    ttsBuffer = ttsBuffer.replace(element, '')
                                })
                                console.log(ttsBuffer)
                                this.ee.emit('llmh:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, diff: ttsBuffer, idx: this.stream_chunk_idx, label: label })
                                this.stream_chunk_idx++
                                isFirstTtsChunk = false
                            }
                            ttsBuffer = ""; // バッファをクリア
                        }
                    }
                }
            }

            // 最後のデータを処理
            if (!/^(\s)*$/.test(ttsBuffer) && ttsBuffer != '') {
                const userNameMatch = ttsBuffer.match(usernameRegex);
                if (userNameMatch) {
                    ttsBuffer = ''
                }
                this.ee.emit('llmh:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, diff: ttsBuffer, idx: this.stream_chunk_idx, label: 'end' })
            }
            this.generatedTextPusher(streamBuffer)

            //本名もしくはニックネームが定まっていないキャラクターについて、発言内容から推測
            for (const noname_key of this.character_sheets.nonames()) {
                const character = this.character_sheets[noname_key].display_name
                this.function_calling(
                    [
                        { role: 'system', content: `以下に示す会話内容をよく読んで、『${character}』の名前が分かればそれを答えよ。会話内容にその情報がない場合や、『${character}』の名前を指していない場合はnullと答えよ。文脈をよく読み、安易に答えないこと。\n\n${this.messageFormatter()}` }
                    ],
                    "updateCharacterName"
                )

            }

            this.abortController?.abort()
        } catch (e: any) {
            // 中断された場合、重複を回避してassistantの発言を会話履歴に追加する
            if (e.name === 'AbortError') {
                this.generatedTextPusher(streamBuffer)
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
        this.previously_episode = ""
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

        const taskString = `以下は${this.character_sheets['user'].display_name}の直近の発言である。これらの発言内容から、${this.character_sheets['user'].display_name}のためにリマインドを設定すべき状況か答えなさい。設定すべきなら「y」、すべきでないなら「n」と答えなさい\n${n_user_utt_content.join("\n")}`
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

    updateCharacterName(args: { "updateName": { prior_name: string, modified_name: string } }) {
        const prior_name = args.updateName.prior_name
        const modified_name = args.updateName.modified_name
        console.log(`prior: ${prior_name}, modify: ${modified_name}`)
        if (this.character_sheets['user'].display_name === prior_name && modified_name !== 'null') {
            this.character_sheets.setName('user', modified_name)
            console.log(this.character_sheets['user'].display_name)
        }
        if (this.character_sheets['bot'].display_name === prior_name && modified_name !== 'null') {
            this.character_sheets.setName('bot', modified_name)
            console.log(this.character_sheets['bot'].display_name)
        }
    }
}

export default ChatGPTHandler