import { StoryObj,Meta } from "@storybook/react";
import MuteButton from "./MuteButton";

const meta = {
    component:MuteButton,
    title:'Components/Molecules/Inputs/MuteButton',
    parameters:{
        layout: 'centered'
    },
    args:{}

} satisfies Meta<typeof MuteButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
    }
}