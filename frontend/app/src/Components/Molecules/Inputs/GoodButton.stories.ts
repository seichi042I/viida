import { StoryObj,Meta } from "@storybook/react";
import GoodButton from "./GoodButton";

const meta = {
    component:GoodButton,
    title:'Components/Molecules/Inputs/GoodButton',
    parameters:{
        layout: 'centered'
    },

} satisfies Meta<typeof GoodButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
        iconProps:{top:"-1px"},
        padding:'0.7em'
    }
}