import React from "react";
import { useRef } from "react";
import WebSocketHandler from "@/Modules/WebSocketHandler";
import EventEmitter from "eventemitter3";
import IncrementalTextDisplay from "@/Components/Molecules/Containers/IncrementalTextDisplay";
import ArrowUpButton from "@/Components/Molecules/Inputs/ArrowUpButton";

const WSTest = () => {
  const eeRef = useRef(new EventEmitter())
  const wshRef = useRef(new WebSocketHandler(eeRef.current))
  const receivedMessageRef = useRef("")

  eeRef.current.on('wsh:onmessage', (event) => {
    console.log("logging by event emitter")
    receivedMessageRef.current = ""
    setTimeout(() => {
      receivedMessageRef.current = event.data
    }, 100);
  })

  return (
    <div style={{ background: 'black' }}>
      <ArrowUpButton onClick={() => { wshRef.current.sendMessage("text", "ボダンが押されました!") }} />
      <IncrementalTextDisplay contentRef={receivedMessageRef} textColor="white" />
    </div>
  )
}

export default WSTest