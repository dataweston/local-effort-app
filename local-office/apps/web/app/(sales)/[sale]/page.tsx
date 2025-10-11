import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SaleRenderer } from '../../../components/sale/SaleRenderer';
import { buildSaleMetadata, fetchSaleBySlug, fetchSaleSlugs } from '../../../lib/sales';

export const revalidate = 60;
export const dynamic = 'force-static';
export const dynamicParams = true;

type PageParams = {
  sale: string;
};

type SalePageProps = {
  params: PageParams;
};

export async function generateStaticParams(): Promise<PageParams[]> {
  const slugs = await fetchSaleSlugs();
  return slugs.map((slug) => ({ sale: slug }));
}

export async function generateMetadata({ params }: SalePageProps): Promise<Metadata> {
  const sale = await fetchSaleBySlug(params.sale);
  return buildSaleMetadata(sale, params.sale);
}

export default async function SalePage({ params }: SalePageProps) {
  const sale = await fetchSaleBySlug(params.sale);

  if (!sale) {
    notFound();
  }

  return <SaleRenderer sale={sale} />;
}
