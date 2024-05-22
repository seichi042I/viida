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
      receivedMessageRef.current += data['diff']
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
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%" }} >
      <IncrementalTextDisplay contentRef={receivedMessageRef} textColor="white" />
      <TextWithSubmit
        textInputRef={textInputRef}
        onSubmit={promptSubmit}
        width="90%"
        height="2em"
      />
    </div>
  )
}

export default WSTest