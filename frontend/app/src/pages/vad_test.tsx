import React, { useRef, MutableRefObject } from "react"
import { useEffect } from "react"
import MicRecorder from "@/Components/Molecules/Media/MicRecorder"

export const Home = () => {
  const stream:MutableRefObject<MediaStream | undefined> = useRef<MediaStream>()
  const micRecorder:MutableRefObject<MicRecorder | undefined> = useRef<MicRecorder>()

  useEffect(()=>{
    const init = async () => {
      stream.current = await navigator.mediaDevices.getUserMedia({audio:true,video:false})
      micRecorder.current = new MicRecorder(stream.current)
      micRecorder.current.onDataAvailable = data => {
        console.log(data.size)
      }
      micRecorder.current.start()
      console.log("useEffect pass")
    }
    init()
  },[])

  const stop = () => {
    if(micRecorder.current){
      micRecorder.current.stop()
    }
  }

  const restart = () => {
    if(micRecorder.current){
      micRecorder.current.restart()
    }
  }

  return (
    <div>
      <button onClick={stop}>stop</button>
      <button onClick={restart}>restart</button>
    </div>
  )
}

export default Home