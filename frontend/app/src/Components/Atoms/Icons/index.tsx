import styled,{css} from "styled-components"
import { JsxElement } from "typescript"

export default interface IconProps{
    iconName?:string
    //位置とサイズ
    paddingTop?:string,
    paddingRight?:string,
    paddingBottom?:string,
    paddingLeft?:string,
    width?:string,
    height?:string,
    position?: "relative" | "absolute"
    top?: string,
    right?:string,
    bottom?:string,
    left?:string,
    translateX?:string,
    translateY?:string,
    
    //表示と可視性
    visibility?: "visible" | "hidden",
    opacity?: number,
    display?: "block" | "inline" | "flex" | "none",

    //色とスタイル
    color?:string,
    fill?:string,
    fillOpacity?:number,
    stroke?:string,
    strokeWidth?:number,
    strokeOpacity?:number,
    strokeLinecap?:"butt" | "round" | "square",
    strokeLinejoin?:"miter" | "round" | "bevel",
    strokeDasharray?:string,
    strokeDashoffset?:number,
}
export const SVG = styled.svg<IconProps>`
    min-width: 0.5em;
    min-height: 0.5em;
    ${({width}) => width ? css`width:${width}` : '100%'};
    ${({height}) => height ? css`height:${height}` : '100%'};
    position: ${({position}) => position ? position : 'relative'};
    top: ${({top}) => top ? top : 'auto'};
    right: ${({right}) => right ? right : 'auto'};
    bottom: ${({bottom}) => bottom ? bottom : 'auto'};
    left: ${({left}) => left ? left : 'auto'};
    padding-top: ${({paddingTop}) => paddingTop ? paddingTop:0};
    padding-right: ${({paddingRight}) => paddingRight ? paddingRight:0};
    padding-bottom: ${({paddingBottom}) => paddingBottom ? paddingBottom:0};
    padding-left: ${({paddingLeft}) => paddingLeft ? paddingLeft:0};
    
    color: ${({color}) => color ? color : "white"};
    stroke: ${({stroke}) => stroke ? stroke : "white"};
    stroke-width: ${({strokeWidth}) => strokeWidth ? strokeWidth : "1px"};
    transform: translateX(${({translateX}) => translateX ? translateX : "0px"});
    transform: translateY(${({translateY}) => translateY ? translateY : "0px"});
    `

    export const SVGPaths:{[key:string]:JSX.Element} = {
        "good":(<path d="M3 7H1a1 1 0 0 0-1 1v8a2 2 0 0 0 4 0V8a1 1 0 0 0-1-1Zm12.954 0H12l1.558-4.5a1.778 1.778 0 0 0-3.331-1.06A24.859 24.859 0 0 1 6 6.8v9.586h.114C8.223 16.969 11.015 18 13.6 18c1.4 0 1.592-.526 1.88-1.317l2.354-7A2 2 0 0 0 15.954 7Z"/>),
        "arrow_up":(<path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/>),
        "menu":<path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/>,
        "mic":<path d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"/>,
        "mute":<path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L472.1 344.7c15.2-26 23.9-56.3 23.9-88.7V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 21.2-5.1 41.1-14.2 58.7L416 300.8V96c0-53-43-96-96-96s-96 43-96 96v54.3L38.8 5.1zm362.5 407l-43.1-33.9C346.1 382 333.3 384 320 384c-70.7 0-128-57.3-128-128v-8.7L144.7 210c-.5 1.9-.7 3.9-.7 6v40c0 89.1 66.2 162.7 152 174.4V464H248c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H344V430.4c20.4-2.8 39.7-9.1 57.3-18.2z"/>,
    }