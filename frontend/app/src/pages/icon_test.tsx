import Icon from "@/Components/Atoms/Icons/SVGIcon";
import React from "react";
import { useRef } from "react";


const IconTest = () => {
  const receivedMessageRef = useRef("")


  return (
    <div>
        <button>

        <Icon iconName="good"/>
        </button>
    </div>
  )
}

export default IconTest