import { StoryObj,Meta } from "@storybook/react";
import MicButton from "./MicButton";

const meta = {
    component:MicButton,
    title:'Components/Molecules/Inputs/MicButton',
    parameters:{
        layout: 'centered'
    },

} satisfies Meta<typeof MicButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
    }
}