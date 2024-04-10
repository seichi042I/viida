import React from "react";
import MuteIcon from "../../Atoms/Icons/Mute";
import Button from "../../Atoms/Inputs/Button";
import type { IconButtonProps } from "./Interface";

const MuteButton = ({iconProps={},...buttonProps}:IconButtonProps) => {
    return (
        <Button {...buttonProps}>
            <MuteIcon {...iconProps} />
        </Button>
    )
}

export default MuteButton;