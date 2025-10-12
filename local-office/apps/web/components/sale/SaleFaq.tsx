import type { NormalizedSale } from '../../lib/sales';
import type { SaleTheme } from './theme';

export function SaleFaq({ sale, theme }: { sale: NormalizedSale; theme: SaleTheme }) {
  const faqs = Array.isArray(sale.faqs) ? sale.faqs : [];
  if (faqs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6" aria-labelledby="sale-faq-heading">
      <div className="space-y-2">
        <h2 id="sale-faq-heading" className="text-2xl font-semibold">
          Frequently asked questions
        </h2>
        <p className="text-sm" style={{ color: theme.muted }}>
          Answers to the most common questions about this sale.
        </p>
      </div>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details
            key={`${faq.question}-${index}`}
            className="group rounded-2xl border p-5 shadow-sm transition"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
          >
            <summary
              className="cursor-pointer select-none text-base font-semibold outline-none transition group-open:text-opacity-100"
              style={{ color: theme.foreground }}
            >
              {faq.question}
            </summary>
            <div className="mt-2 text-sm leading-relaxed" style={{ color: theme.muted }}>
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
