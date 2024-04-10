import dynamic from "next/dynamic"

const Demo = dynamic(() => import("../Components/Demo/index"), {
  ssr: false,
})

export default function Home() {
  return <Demo />
}