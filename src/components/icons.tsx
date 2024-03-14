import { Component } from 'solid-js'

interface IconProps {
  class?: string
  size?: number
  strokeWidth?: number
  fill?: string
}

export const MenuIcon: Component<IconProps> = (props) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={props.size ? props.size : 24}
      height={props.size ? props.size : 24}
      viewBox='0 0 24 24'
      fill={props.fill ? props.fill : 'none'}
      stroke='currentColor'
      stroke-width={props.strokeWidth ? props.strokeWidth : 2}
      stroke-linecap='round'
      stroke-linejoin='round'
      class={props.class}
    >
      <line x1='4' x2='20' y1='12' y2='12' />
      <line x1='4' x2='20' y1='6' y2='6' />
      <line x1='4' x2='20' y1='18' y2='18' />
    </svg>
  )
}

export const LoaderIcon: Component<IconProps> = (props) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={props.size ? props.size : 24}
      height={props.size ? props.size : 24}
      viewBox='0 0 24 24'
      fill={props.fill ? props.fill : 'none'}
      stroke='currentColor'
      stroke-width={props.strokeWidth ? props.strokeWidth : 2}
      stroke-linecap='round'
      stroke-linejoin='round'
      class={props.class}
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}
