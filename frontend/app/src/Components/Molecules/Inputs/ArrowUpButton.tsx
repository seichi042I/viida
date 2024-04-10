import React from "react";
import ArrowUpIcon from "../../Atoms/Icons/ArrowUp";
import Button from "../../Atoms/Inputs/Button";
import type { IconButtonProps } from "./Interface";

const ArrowUpButton = ({iconProps={},...buttonProps}:IconButtonProps) => {
    return (
        <Button {...buttonProps}>
            <ArrowUpIcon {...iconProps} />
        </Button>
    )
}

export default ArrowUpButton;