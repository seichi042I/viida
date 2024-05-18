import { MutableRefObject, useRef, } from "react";
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
  onClick?: () => void
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

  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;

`

interface TextInputProps {
  width?: string;
  height?: string;
}
const TextInput = styled.input<TextInputProps>`
  width: 90%;
  height: 90%;
  border-radius: 9999px;
`

export default ({ className = "", iconButtonProps = { iconName: "arrow_up" }, textInputRef = undefined, onClick = () => { }, width = "256px", height = "32px", ...props }: TextWithSubmitProps) => {

  return (
    <Container className={className} width={width} height={height} {...props}>
      <TextInput className="text-base sm:text-lg md:text-xl lg:text-2xl" ref={textInputRef} type="text" />
      <IconButton onClick={onClick} buttonProps={{ "width": height, "height": height }} {...iconButtonProps} />
    </Container>
  )
}
