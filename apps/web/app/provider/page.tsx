import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@local-office/ui';

const workflows = [
  {
    title: 'Prep manifests',
    description: 'Batch-level manifests include order notes, allergen warnings, and tips for on-time delivery.'
  },
  {
    title: 'Label generation',
    description: 'Download Avery-ready PDFs or stream ZPL for Zebra printers—complete with QR codes.'
  },
  {
    title: 'Delivery tracking',
    description: 'Monitor Dispatch or Uber Direct status updates and upload proof of delivery right from the console.'
  }
];

export default function ProviderPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <Badge variant="warning">Provider console</Badge>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Clarity for every prep shift.</h1>
        <p className="max-w-2xl text-slate-600">
          Providers get a single queue of upcoming batches with quick access to manifests, labels, and courier updates.
        </p>
        <Button>View sample manifest</Button>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {workflows.map((item) => (
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
