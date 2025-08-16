import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function Home() {
  return (
    <div className="container mx-auto py-10 text-center">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">ENS Frontend Examples</h1>
        <p className="text-lg">
          This is a collection of examples of how to use ENS in frontend
          applications.
        </p>
      </header>

      <main className="mt-10">
        <div className="grid grid-cols-2 gap-4">
          <ExampleCard
            href="/"
            title="Name/Address Input"
            description="Every address input should also accept ENS names."
          />

          <ExampleCard
            href="/"
            title="ENS Profile"
            description="Show the primary and avatar for an ENS name."
          />
        </div>
      </main>
    </div>
  )
}

type Props = {
  title: string
  description: string
  href: string
}

function ExampleCard({ title, description, href }: Props) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to={href}>View Example</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
