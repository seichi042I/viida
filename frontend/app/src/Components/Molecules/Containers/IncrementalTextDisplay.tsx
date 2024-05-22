import React, { useEffect } from "react";
import type { RefObject } from "react";
import { useRef, memo } from "react";
import type AnimProps from "../../Atoms/Animations/Interfaces";
import OrnamentalCursor from "../../Atoms/Animations/OrnamentalCursor";

interface IncrementalTextDisplayProps {
    contentRef: RefObject<string>;
    interval?: number;
    animProps?: AnimProps;
    textColor?: string;
}

const IncrementalTextDisplay = memo<IncrementalTextDisplayProps>(({ contentRef = useRef("this is default test content."), interval = 32, ...props }) => {
    const elementRef: RefObject<HTMLDivElement> = useRef(null)
    const displaiedTextRef = useRef('')
    const corsorRef = useRef<string>()

    useEffect(() => {
        console.log("init")
        setInterval(() => {
            if (!corsorRef.current) {
                corsorRef.current = elementRef.current?.innerHTML.slice(elementRef.current?.innerText.replace('\n', '<br>').length)
            }
            if (contentRef.current !== null && displaiedTextRef.current !== null) {
                if (contentRef.current.length !== displaiedTextRef.current.length) {
                    const displaiedIdx = displaiedTextRef.current.length
                    displaiedTextRef.current = contentRef.current.slice(0, displaiedIdx + 1)
                    if (elementRef.current) {
                        elementRef.current.innerText = displaiedTextRef.current;
                        if (corsorRef.current) {
                            elementRef.current.innerHTML += corsorRef.current;
                        }
                    }
                } else {

                }
            }
        }, interval)
    }, [])

    return (
        <div className='text-xl' style={{ width: "90%", textAlign: "left", color: props.textColor }} ref={elementRef}>
            <OrnamentalCursor />
        </div>
    )
})

export default IncrementalTextDisplay;