import React, { useEffect } from "react";
import type { RefObject } from "react";
import { useRef,memo } from "react";
import type AnimProps from "../../Atoms/Animations/Interfaces";
import OrnamentalCursor from "../../Atoms/Animations/OrnamentalCursor";

interface ITDProps{
    contentRef:RefObject<string>;
    interval?:number;
    animProps?: AnimProps;
}

const ITD = memo<ITDProps>(({contentRef=useRef("this is default test content."),interval=64,...props}) => {
    const elementRef:RefObject<HTMLDivElement> = useRef(null)
    const displaiedTextRef = useRef('')

    useEffect(() => {
        setInterval(()=>{
            if(contentRef.current !== null && displaiedTextRef.current !== null){
                if(contentRef.current.length !== displaiedTextRef.current.length){
                    const displaiedIdx = displaiedTextRef.current.length
                    displaiedTextRef.current = contentRef.current.slice(0,displaiedIdx+1)
                    if(elementRef.current){
                        const corsor = elementRef.current.innerHTML.slice(displaiedIdx)
                        elementRef.current.innerText = displaiedTextRef.current;
                        elementRef.current.innerHTML += corsor;
                    }
                }else{

                }
            }
        },interval)
    },[])

    return (
        <div style={{display:"inline"}} ref={elementRef}>
            <OrnamentalCursor />
        </div>
    )
})

export default ITD;