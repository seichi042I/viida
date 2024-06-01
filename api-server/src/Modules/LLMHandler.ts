import EventEmitter from "eventemitter3";
import CharacterSheets from "./CharacterSheet"
import { Stream } from "stream";
import { StreamPriorityOptions } from "http2";
import { ChatCompletionStream } from "openai/lib/ChatCompletionStream";

const PREPROMPT = ""

export interface StreamProcessData {
    ee: EventEmitter
    chunk: any
    ttsBuffer: string
    streamBuffer: string
    diff: string
    spk_label: string
    isFirstTtsChunk: boolean
    option?: any
}


const getRandomInt = (max: number) => {
    const _max = Math.floor(max)
    return Math.floor(Math.random() * _max);
}

abstract class LLMHandler {
    preprompt: string
    previously_episode: string
    current_conversation: Array<{ "role": string, "content": string }>
    ee: EventEmitter
    abortController?: AbortController | any
    prev_request_time: number
    stream_chunk_idx: number
    character_sheets: CharacterSheets
    system_content_prefix: Array<string>
    revision_grace_period: number

    constructor(
        ee: EventEmitter,
        preprompt = PREPROMPT,
    ) {
        this.preprompt = preprompt
        this.previously_episode = ""
        this.current_conversation = []
        this.ee = ee
        this.abortController = undefined
        this.prev_request_time = Date.now()
        this.stream_chunk_idx = 0
        this.character_sheets = new CharacterSheets({ user: { initial_label: "user" }, bot: { initial_label: "少女" } })
        this.system_content_prefix = []

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
        this.ee.emit('llmh:insertedUserPrompt', user_prompt)
    }

    abstract sendMessage(): void

    abstract messageFormatter(): string

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
                        } else if (this.system_content_prefix.includes(content)) {
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
                        console.log("セリフ:", JSON.stringify(bracket_split));
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

    abstract chunkProcesser(streamProcessData: StreamProcessData): { ttsBuffer: string, streamBuffer: string, diff: string, spk_label: string, isFirstTtsChunk: boolean, breakFlag: boolean }

    async streamProcesser(stream?: AsyncIterableIterator<any> | ChatCompletionStream) {
        if (stream === undefined) return
        let ttsBuffer = ""
        let streamBuffer = ""
        let diff = ""
        let spk_label = "system"
        let isFirstTtsChunk = true

        // 正規表現を用いて句読点などを
        const punctuationRegex = /([\/#!$%\^&\*;:{}=\-_`~()？！、。」])/;
        const usernameRegex = new RegExp(`${this.character_sheets['user'].display_name}「`);
        const botnameRegex = new RegExp(`${this.character_sheets['bot'].display_name}「`);

        // ストリーミング処理
        try {
            this.stream_chunk_idx = 0
            for await (const chunk of stream) {
                const streamProcessData = {
                    ee: this.ee,
                    chunk: chunk,
                    ttsBuffer: ttsBuffer,
                    streamBuffer: streamBuffer,
                    diff: diff,
                    spk_label: spk_label,
                    isFirstTtsChunk: isFirstTtsChunk,
                    option: {
                        punctuationRegex: punctuationRegex,
                        usernameRegex: usernameRegex,
                        botnameRegex: botnameRegex
                    }
                }

                const newData = this.chunkProcesser(streamProcessData)
                ttsBuffer = newData.ttsBuffer
                streamBuffer = newData.streamBuffer
                diff = newData.diff
                spk_label = newData.spk_label
                isFirstTtsChunk = newData.isFirstTtsChunk
                if (newData.breakFlag) {
                    break;
                }
            }

            // 最後のデータを処理
            if (!/^(\s)*$/.test(ttsBuffer) && ttsBuffer != '') {
                if (ttsBuffer === this.character_sheets['user'].display_name) {
                    ttsBuffer = ''
                }
                this.ee.emit('llmh:data', { ttsBuffer: ttsBuffer, streamBuffer: streamBuffer, diff: diff, spk_label: spk_label, idx: this.stream_chunk_idx, label: 'end' })
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
        this.previously_episode = ""
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

export default LLMHandler