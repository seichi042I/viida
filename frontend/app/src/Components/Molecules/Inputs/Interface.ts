import { ButtonProps } from "../../Atoms/Inputs/Button";
import IconProps from "../../Atoms/Icons";

export interface IconButtonProps extends ButtonProps{
    iconProps?:IconProps;
}