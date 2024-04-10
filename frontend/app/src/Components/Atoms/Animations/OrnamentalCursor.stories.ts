import { StoryObj, Meta } from "@storybook/react";
import OrnamentalCursor from "./OrnamentalCursor";

const meta = {
    component:OrnamentalCursor,
    title:'Components/Atoms/Animations/OrnamentalCursor',
    args:{
        
    }
} satisfies Meta<typeof OrnamentalCursor>

export default meta
type Story = StoryObj<typeof meta>

export const Primary:Story = {
    args:{
        active:false
    }
}