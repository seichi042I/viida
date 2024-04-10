// import { useMicVAD, utils } from "@ricky0123/vad-react"
import { useState } from "react"
import { MicVAD } from "@ricky0123/vad-web"
import { useEffect } from "react"
export const Demo = () => {
  const [audioList, setAudioList] = useState<string[]>([])
  // const vad = useMicVAD({
  //   onSpeechEnd: (audio) => {
  //     const wavBuffer = utils.encodeWAV(audio)
  //     const base64 = utils.arrayBufferToBase64(wavBuffer)
  //     const url = `data:audio/wav;base64,${base64}`
  //     setAudioList((old) => {
  //       return [url, ...old]
  //     })
  //   },
  // })
  const init = async ()=>{
    const vad = await MicVAD.new()
    vad.start()
    console.log(vad.stream)
  }
  useEffect(()=>{
    init()
  },[])

  return (
    <div>
    </div>
  )
}

export default Demo
