import { StoryObj,Meta } from "@storybook/react";
import Icon from "./SVGIcon";

const meta = {
    component:Icon,
    title:'Components/Atoms/Icons/Icon',
    args:{
        iconName:'good'
    }
} satisfies Meta<typeof Icon>

export default meta;
type Story = StoryObj<typeof meta>

export const Primary:Story = {}