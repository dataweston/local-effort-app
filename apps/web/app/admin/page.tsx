import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@local-office/ui';

const capabilities = [
  {
    title: 'Program builder',
    description: 'Define cadence, providers, subsidies, and the 48-hour cutoff per program or site.'
  },
  {
    title: 'Financial clarity',
    description: 'Weekly and monthly invoices summarize delivery fees, tips, credits, and Square payment fees.'
  },
  {
    title: 'Operational alerts',
    description: 'Admins receive SMS/email delivery confirmations, incident updates, and webhook audit trails.'
  }
];

export default function AdminPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <Badge>Laptop ready</Badge>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Control programs, budgets, and credits.</h1>
        <p className="max-w-2xl text-slate-600">
          Admins tailor subsidies, manage loyalty tiers, and resolve incidents with automation-friendly tooling.
        </p>
        <Button variant="outline">Connect Square</Button>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {capabilities.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
