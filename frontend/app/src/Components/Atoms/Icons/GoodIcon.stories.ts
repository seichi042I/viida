import { StoryObj,Meta } from "@storybook/react";
import GoodIcon from "./GoodIcon";

const meta = {
    component:GoodIcon,
    title:'Components/Atoms/Icons/GoodIcon',
    args:{

    }
} satisfies Meta<typeof GoodIcon>

export default meta;
type Story = StoryObj<typeof meta>

export const Primary:Story = {}