import React from "react";
import styled, { css } from "styled-components";
import type AnimProps from "./Interfaces";

const Span = styled.span<AnimProps>`
    display: inline-block;
    width: 0.2em;
    height: 1em;
    background-color: lightskyblue;

    @keyframes cursorFade {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }
    ${({active}) => active ? '' : 'animation: cursorFade 1.2s infinite'};
    
`

const OrnamentalCursor = (props:AnimProps) => {
    return (
        <Span {...props}></Span>
    )   
}

export default OrnamentalCursor