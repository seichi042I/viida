import { StoryObj,Meta } from "@storybook/react";
import IconButton from "./IconButton";

const meta = {
    component:IconButton,
    title:'Components/Molecules/Inputs/IconButton',
    parameters:{
        layout: 'centered'
    },
    args:{
        iconName:"good"
    }

} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
        iconName:"good"
    }
}