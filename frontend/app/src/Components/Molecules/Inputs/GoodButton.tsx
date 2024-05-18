import React from "react";
import GoodIcon from "../../Atoms/Icons/Good";
import Button from "../../Atoms/Inputs/Button";
import type { IconButtonProps } from "./Interface";

const GoodButton = ({iconProps,...buttonProps}:IconButtonProps) => {
    return (
        <Button {...buttonProps}>
            <GoodIcon {...iconProps} />
        </Button>
    )
}

export default GoodButton;