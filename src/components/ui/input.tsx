import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type InputBaseProps = React.ComponentProps<'input'> & {
  loading?: boolean
}

function InputBase({ className, type, loading, ...props }: InputBaseProps) {
  return (
    <div className="relative">
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
        {...props}
      />

      {loading && (
        <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin" />
      )}
    </div>
  )
}

type InputProps = InputBaseProps & {
  label?: string
}

function Input({ label, ...props }: InputProps) {
  if (label) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <InputBase {...props} />
      </div>
    )
  }

  return <InputBase {...props} />
}

export { Input }
