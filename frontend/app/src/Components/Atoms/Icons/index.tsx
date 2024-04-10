import styled,{css} from "styled-components"

export default interface IconProps{
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
    ${({width}) => width ? css`width:${width}` : ''};
    ${({height}) => height ? css`height:${height}` : ''};
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
    `