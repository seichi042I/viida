import { staticGenerationAsyncStorage } from "next/dist/client/components/static-generation-async-storage.external";
import React from "react";
import { addEmitHelpers } from "typescript";

type onDataAvailable = (data:Blob) => void;
class MicRecorder{
    public stream?:MediaStream;
    public mediaRecorder?:MediaRecorder;
    public onDataAvailable:onDataAvailable = data => {}
    private isRecording:boolean = false;

    constructor(stream:MediaStream){
        this.stream = stream
    }

    start(){
        if (this.stream && !this.isRecording) {
            this.isRecording = true
            this.mediaRecorder = new MediaRecorder(this.stream,{mimeType:'audio/webm'});
            this.mediaRecorder.start(250);
            console.log("MicRecorder: recording start");
    
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log(Object.prototype.toString.call(event.data))
                    this.onDataAvailable(event.data)
                }
            };
    
            this.mediaRecorder.onstop = () => {
                this.isRecording = false
                console.log("MicRecorder: recording stop");
            };
        }
    }

    stop(){
        if(this.mediaRecorder){
            this.mediaRecorder.stop()
        }
    }
    restart(){
        this.stop()
        const starting = () => {
            setTimeout(() => {
                console.log("starting:",this.isRecording)
                if(this.isRecording){
                    starting()
                }else if(this.mediaRecorder){
                    this.start()
                }
            }, 50);
        }
        starting()
    }
    
}

export default MicRecorder