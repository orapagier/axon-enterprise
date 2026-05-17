import React from "react"

import { IconProps } from "types/icon"

const Hexagon: React.FC<IconProps> = ({
  size = "24",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M12 2L21.196 7.5V18.5L12 24L2.804 18.5V7.5L12 2Z"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default Hexagon
