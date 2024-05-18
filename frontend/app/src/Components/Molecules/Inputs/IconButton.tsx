import React from "react";
import Button from "@/Components/Atoms/Inputs/Button";
import Icon from "@/Components/Atoms/Icons/SVGIcon";
import type { IconButtonProps } from "./Interface";

const IconButton = ({iconName="good",onClick=()=>{},...props}:IconButtonProps) => {
    return (
        <Button onClick={onClick} {...props.buttonProps}>
            <Icon iconName={iconName} {...props.iconProps}/>
        </Button>
    )
}

export default IconButton;