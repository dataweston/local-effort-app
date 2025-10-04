import Link from 'next/link';

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@local-office/ui';

const steps = [
  {
    title: 'Pick your date',
    description: 'Employees see eligible Program Slots with clear T-48h cutoff messaging and subsidies.'
  },
  {
    title: 'Choose your meal',
    description: 'Curated menus highlight allergens and loyalty savings. Quantities per order are capped at 50 items.'
  },
  {
    title: 'Confirm payment',
    description: 'Square handles ACH-first payments with transparent card fees and instant loyalty credits.'
  }
];

export default function EmployeePage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <Badge variant="outline">Employee experience</Badge>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Meal ordering without the chaos.</h1>
        <p className="max-w-2xl text-slate-600">
          The employee portal keeps ordering under the 48-hour cutoff, surfaces dietary guidance, and handles payment in
          a single flow.
        </p>
        <Button asChild>
          <Link href="/request-demo">Invite your team</Link>
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{step.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
