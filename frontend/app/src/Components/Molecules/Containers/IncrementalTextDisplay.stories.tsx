import { StoryObj,Meta } from "@storybook/react";
import ITD from "./IncrementalTextDisplay";
import { useRef,useEffect } from "react";

const meta = {
    component:ITD,
    title:'Components/Molecules/Containers/IncrementalTextDisplay',
    parameters:{
        layout:"centered"
    },
    args:{
        animProps:{
            active:false
        }
    }
} satisfies Meta<typeof ITD>

export default meta;
type Story = StoryObj<typeof meta>

export const Primary = {
    args:{
        value:''
    },
    render: function Comp({value='this is test.', ...args }:{value:string,}){  // 関数コンポーネントを定義
        const contentRef = useRef('')
        useEffect(()=>{contentRef.current = value},[value])
        return (
          <meta.component
            contentRef={contentRef}
          ></meta.component>
        );
      },
}