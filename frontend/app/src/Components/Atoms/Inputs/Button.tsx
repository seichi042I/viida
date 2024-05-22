import React from 'react';
import styled, { css } from 'styled-components';

export interface ButtonProps {
  //サイズ
  width?: string;
  height?: string;

  //表示と可視性
  visibility?: "visible" | "hidden";
  opacity?: number;
  display?: "block" | "flex" | "inline" | "none";

  //色とスタイル
  color?: string;
  bgColor?: string | { r: number, g: number, b: number };
  bgOpacity?: number;
  border?: string;
  borderRadius?: string;
  stroke?: string;
  strokeWidth?: number;

  //レイアウト
  padding?: string;
  margine?: string

  //その他
  label?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const Button = styled.button<ButtonProps>`
  min-width: 1em;
  min-height: 1em;
  ${({ width }) => width ? css`width:${width}` : 'width: 3em'};
  ${({ height }) => height ? css`height:${height}` : 'height: 3em'};

  ${({ color }) => color ? css`color:${color}` : css`color: white`};
  background-color: ${({ bgColor, bgOpacity }) => {
    const opacity = typeof bgOpacity == 'number' ? bgOpacity : 0.33
    if (typeof bgColor == 'string') {
      // 先頭の'#'を除去し、16進数の数値としてRGBの各成分をパース
      const r = parseInt(bgColor.slice(1, 3), 16);
      const g = parseInt(bgColor.slice(3, 5), 16);
      const b = parseInt(bgColor.slice(5, 7), 16);
      return css`rgba(${r},${g},${b},${opacity})`
    } else if (typeof bgColor == "object") {
      const { r, g, b } = bgColor;
      return css`rgba(${r},${g},${b},${opacity})`
    } else {
      return css`rgba(128,128,128,${opacity})`
    }
  }};
  border: ${({ border }) => border ? border : css`none`};
  border-radius: ${({ border }) => border ? border : '9999px'};

  display: ${({ display }) => display ? display : 'inline'}; 
  justify-content: center; 
  align-items: center; 
  margine: ${({ margine }) => margine ? margine : '0.4em'};
  padding: 0px;
  flex-shrink: 0;
`


export default ({
  label = '',
  children = undefined,
  ...props
}: ButtonProps) => {
  return (
    <Button type="button" {...props}>
      {label}
      {children}
    </Button>
  );
};
