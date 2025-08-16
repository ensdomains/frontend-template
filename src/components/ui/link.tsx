import { cn } from '@/lib/utils'

function ExternalLink({ className, ...props }: React.ComponentProps<'a'>) {
  return (
    <a
      rel="noopener"
      target="_blank"
      className={cn(
        'text-muted-foreground text-sm underline underline-offset-4',
        className
      )}
      {...props}
    >
      {props.children}
    </a>
  )
}

export function GitHubFooter({ href }: { href: string }) {
  return (
    <div className="mt-2 text-center">
      <ExternalLink href={href}>View code on GitHub</ExternalLink>
    </div>
  )
}
