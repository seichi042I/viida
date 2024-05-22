import { MutableRefObject, useState, useRef, useEffect } from "react";
import React from "react";
import IconButton from "../../Molecules/Inputs/IconButton";
import type { IconButtonProps } from "../../Molecules/Inputs/Interface";
import styled, { css } from "styled-components";

type SubmitEvent = { value?: string, error?: string }

interface ContainerProps {
  width?: string;
  height?: string;
  bgColor?: string | { r: number, g: number, b: number };
  bgOpacity?: number;
}

interface TextWithSubmitProps extends ContainerProps {
  className?: string
  textInputRef?: MutableRefObject<HTMLInputElement | null>;
  onSubmit?: () => void
  iconButtonProps?: IconButtonProps;
}

const Container = styled.div<ContainerProps>`
    width: ${({ width }) => width ? width : '20em'};
    height: ${({ height }) => height ? height : '3em'};
    
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

    border-radius: 9999px;

    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margine-left: auto;
    margine-right: auto;
    `

interface TextInputProps {
  width?: string;
  height?: string;
  fontSize?: string;
}
const TextInput = styled.input<TextInputProps>`
  background: transparent;
  color: white;
  width: ${({ width }) => width ? width : '100%'};
  height: ${({ height }) => height ? height : '100%'};
  margin-left: 1em;
  margin-right: 1em;
  padding: 0px;
  border-width: 0px;

  font-size: ${({ fontSize }) => fontSize ? fontSize : '1em'};
`

export default ({ className = "", iconButtonProps = { iconName: "arrow_up" }, textInputRef = useRef<HTMLInputElement>(null), onSubmit: onSubmit = () => { }, width = "256px", height = "32px", ...props }: TextWithSubmitProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSubmit()
    }
  }
  useEffect(() => {
    // コンポーネントがマウントされた後に要素の高さを取得
    if (divRef.current) {
      setContainerHeight(divRef.current.offsetHeight);
      console.log(divRef.current.offsetHeight)
    }
  }, []);


  return (
    <Container ref={divRef} width={width} height={height} {...props}>
      <TextInput onKeyDownCapture={onKeyDown} placeholder="Enter your text" ref={textInputRef} type="text" />
      <IconButton
        onClick={onSubmit}
        buttonProps={{ "width": containerHeight + "px", "height": containerHeight + "px" }}
        {...iconButtonProps} />
    </Container>
  )
}
