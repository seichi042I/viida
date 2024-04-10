import React from "react";
import MicIcon from "../../Atoms/Icons/Mic";
import Button from "../../Atoms/Inputs/Button";
import type { IconButtonProps } from "./Interface";

const MicButton = ({iconProps={},...buttonProps}:IconButtonProps) => {
    return (
        <Button {...buttonProps}>
            <MicIcon {...iconProps} />
        </Button>
    )
}

export default MicButton;