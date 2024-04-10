import { StoryObj,Meta } from "@storybook/react";
import TextWithSubmit from "./TextWithSubmit";

const meta = {
    component:TextWithSubmit,
    title:'Components/Organisms/Inputs/TextWithSubmit',
    parameters:{
        layout: 'centered'
    },
    args:{
        bgColor:"#a0a0a0",
        bgOpacity:0.5,
        iconButtonProps:{
            onClick:()=>{console.log("on click")},
            iconProps:{}
        }
    }

} satisfies Meta<typeof TextWithSubmit>

export default meta;
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
    }
}