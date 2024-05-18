import { ButtonProps } from "../../Atoms/Inputs/Button";
import IconProps from "../../Atoms/Icons";

export interface IconButtonProps extends ButtonProps{
    iconName?:string;
    onClick?:() => void
    iconProps?:IconProps;
    buttonProps?:ButtonProps;
}