// const EventEmitter = require('events');

// class TTSStreamPlayer {
//     constructor(ACRef) {
//         this.ACRef = ACRef

//         //ストリーム再生
//         this.initial_delay_sec = 0
//         this.scheduled_time = 0
//         this.audioSrcList = []

//         //順序通りに再生
//         this.ttsTextBuffer = []
//         this.ttsWaitList = []
//         this.receivedTTSDataCount = 0
//         this.nextPlayIdx = 0
//         this.endOfPlayIdx = -1

//         // 
//         this.onAudioChunk = null
//     }




//     async addAudioChunk(data, text) {
//         let audio_buf = await this.ACRef.current.decodeAudioData(data),
//             audio_src = this.ACRef.current.createBufferSource(),
//             current_time = this.ACRef.current.currentTime;

//         audio_src.buffer = audio_buf;
//         audio_src.connect(this.ACRef.current.destination);
//         this.audioSrcList.push(audio_src)

//         // 現在再生中の音声の終了予定時間に、次の音声の再生予定を入れる
//         let offset = this.scheduled_time - current_time

//         if (current_time < this.scheduled_time) {
//             this.playChunk(audio_src, this.scheduled_time);
//             this.scheduled_time += audio_buf.duration;
//         } else {
//             offset = 0
//             this.playChunk(audio_src, current_time);
//             this.scheduled_time = current_time + audio_buf.duration + this.initial_delay_sec;
//         }
//         console.log(offset)

//         return offset
//     }

//     // 音声を再生する関数
//     playChunk(audio_src, scd_time) {
//         if (audio_src.start) {
//             audio_src.start(scd_time);
//         } else {
//             audio_src.noteOn(scd_time);
//         }
//     }

//     resetStream() {
//         while (this.audioSrcList.length > 0) {
//             const src = this.audioSrcList.pop()
//             src.stop()
//         }

//         this.scheduled_time = this.ACRef.current.currentTime + 0.25
//     }


// }

// export default TTSStreamPlayer