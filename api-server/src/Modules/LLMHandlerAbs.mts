import EventEmitter from "eventemitter3";
type FunctionDictionary = {
    [key: string]: (...args: any[]) => any;
};
const MODEL_NAME = "gpt-4o-2024-05-13"
const PREPROMPT = "narration:少女は目を覚ました。少女には名前がまだない。年齢、性格、背格好なども一切不明である。しかし、普通に人と話すことはできる。少女はこれまで自分がどのように過ごしてきたのかという記憶がない。だが不安はない。それらはこれから作っていけばよいのだと前向きに考えたからだ。少女は人の気配を感じた。相手が誰かわからないが、少女はとりあえず話しかけてみる。それは、今はまだ空っぽの自分に何かを与えてくれる最初のチャンスだと考えたからだ。"

abstract class LLMHandlerAbs {
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
    system_content_prefix: Array<string>
    revision_grace_period: number
    completion?: AsyncIterableIterator<any>

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
        this.system_content_prefix = ['narration:']


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

    abstract sendMessage(): void

    messageFormatter() {
        const formated_now_conv = this.convFormatter()

        const formatedMessage = `${this.preprompt}\n\n${this.previously_on_conversation}\n${formated_now_conv}`
        return formatedMessage
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
                    conv_log += `${this.user_name}「${content}」\n`
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

    generatedTextPusher(streamBuffer: string) {
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
            const bot_name_split = streamBuffer.split(`${this.bot_name}「`)
            if (bot_name_split.length > 1) {
                bot_name_split.forEach((element, index) => {
                    const bracket_split = element.split('」')
                    if (bracket_split.length > 1) {
                        console.log("セリフ:", element);
                        this.current_conversation.push({ role: "assistant", content: `${this.bot_name}「${bracket_split[0].replace('\n', '')}」` })
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

    async streamProcesser(completion: AsyncIterableIterator<any>, getChunkText: (chunk: any) => string) {
        if (completion === undefined) return
        let ttsBuffer = ""
        let streamBuffer = ""
        let isFirstTtsChunk = true


        // ストリーミング処理
        try {
            this.stream_chunk_idx = 0
            for await (const chunk of completion) {
                if (chunk == undefined) { continue }

                const chunkToolCalls = chunk.choices[0].delta.tool_calls
                const chunkText = getChunkText(chunk)
                // function callingの処理
                if (chunkToolCalls) {
                    console.log(JSON.stringify(chunkToolCalls))
                } else {
                    //普通のテキストの処理
                    if (chunkText != undefined) {
                        // バッファに文字を追加
                        streamBuffer += chunkText;
                        ttsBuffer += chunkText;
                        if (chunkText.includes('\n') && streamBuffer.includes('」\n')) {
                            break;
                        }

                        // 正規表現を用いて句読点を見つける
                        const punctuationRegex = /([\/#!$%\^&\*;:{}=\-_`~()？！、。」])/;
                        const usernameRegex = new RegExp(`${this.user_name}「`);
                        const botnameRegex = new RegExp(`${this.bot_name}「`);

                        // matchを使って句読点を含むマッチオブジェクトを取得する
                        const puncMatch = chunkText.match(punctuationRegex);
                        const userNameMatch = ttsBuffer.match(usernameRegex);
                        const botNameMatch = ttsBuffer.match(botnameRegex);


                        // ユーザ名を検知
                        if (userNameMatch) {
                            this.ee.emit('cgpth:data', { ttsBuffer: '', streamBuffer: streamBuffer, idx: this.stream_chunk_idx, label: 'end' })
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
                                this.ee.emit('cgpth:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, idx: this.stream_chunk_idx, label: label })
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
                console.log(ttsBuffer)
                this.ee.emit('cgpth:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, idx: this.stream_chunk_idx, label: 'end' })
            }
            this.generatedTextPusher(streamBuffer)

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
        this.previously_on_conversation = ""
    }

    getNUserUtterance(n: number, { with_system_prompt = false } = {}) {
        // ユーザの発言をn個取得
        let user_utt_buff: Array<{ role: string, content: string }> = []
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


    updateCharacterName(args: { "updateName": { prior_name: string, modified_name: string } }) {
        const prior_name = args.updateName.prior_name
        const modified_name = args.updateName.modified_name
        console.log(`prior: ${prior_name}, modify: ${modified_name}`)
        if (this.user_name === prior_name && modified_name !== '') {
            // this.user_name = names.modified_name
            console.log(this.user_name)
        }
        if (this.bot_name === prior_name && modified_name !== '') {
            // this.bot_name = names.modified_name
        }

    }
}

export default LLMHandlerAbs