import type React from 'react'
import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

export function Layout({
  children,
  className,
  ...props
}: PropsWithChildren<React.ComponentProps<'div'>>) {
  return (
    <div className={cn('mx-auto max-w-5xl px-6 py-10', className)} {...props}>
      {children}
    </div>
  )
}
