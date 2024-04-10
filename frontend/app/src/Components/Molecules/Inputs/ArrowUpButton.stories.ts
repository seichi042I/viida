import { StoryObj,Meta } from "@storybook/react";
import ArrowUpButton from "./ArrowUpButton";

const meta = {
    component:ArrowUpButton,
    title:'Components/Molecules/Inputs/ArrowUpButton',
    parameters:{
        layout: 'centered'
    },

} satisfies Meta<typeof ArrowUpButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
    }
}