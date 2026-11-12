import type { ComponentType } from 'react'

import { InputScreen } from './screens/Input'
import { PrimaryNamesScreen } from './screens/PrimaryNames'
import { ProfileScreen } from './screens/Profile'
import { RegisterScreen } from './screens/Register'

/** Every example, in the order they're listed on the home page */
export const examples: {
  path: `/${string}`
  /** Older paths that should still open this example */
  aliases?: `/${string}`[]
  title: string
  description: string
  Screen: ComponentType
}[] = [
  {
    path: '/input',
    title: 'Name or address input',
    description: 'Every address input should also accept ENS names.',
    Screen: InputScreen,
  },
  {
    path: '/records',
    title: 'Profile records',
    description: 'Show the avatar, addresses, and text records of a name.',
    Screen: ProfileScreen,
  },
  {
    path: '/primary-names',
    // This example used to live at /profile
    aliases: ['/profile'],
    title: 'Primary names',
    description: 'Show the primary name of an address on L1 and each L2.',
    Screen: PrimaryNamesScreen,
  },
  {
    path: '/register',
    title: 'Register a name',
    description: 'Register a .eth name on ENSv2, with a resolver you own.',
    Screen: RegisterScreen,
  },
]
