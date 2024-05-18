import React from "react";
import { useRef } from "react";
import WebSocketHandler from "@/Modules/WebSocketHandler";
import EventEmitter from "eventemitter3";
import IncrementalTextDisplay from "@/Components/Molecules/Containers/IncrementalTextDisplay";
import TextWithSubmit from "@/Components/Organisms/Inputs/TextWithSubmit";

const WSTest = () => {
  const eeRef = useRef(new EventEmitter())
  const wshRef = useRef(new WebSocketHandler(eeRef.current))
  const receivedMessageRef = useRef("")
  const textInputRef = useRef<HTMLInputElement>(null!)

  eeRef.current.on('wsh:onmessage', (event) => {
    console.log("logging by event emitter")
    const data = JSON.parse(event.data)
    setTimeout(() => {
      receivedMessageRef.current += data['ttsBuffer']
    }, 50);
  })

  const promptSubmit = () => {
    if (textInputRef.current !== null) {
      wshRef.current.sendMessage('user_prompt', textInputRef.current.value)
      textInputRef.current.value = ""
      receivedMessageRef.current += '\n'
    }
  }

  return (
    <div className="flex-1 overflow-auto mb-4" >
      <IncrementalTextDisplay contentRef={receivedMessageRef} textColor="white" />
      <TextWithSubmit
        className="w-full mt-auto text-sm sm:text-base md:text-lg lg:text-xl"
        textInputRef={textInputRef}
        onClick={promptSubmit}
        height="3em"
      />
    </div>
  )
}

export default WSTest