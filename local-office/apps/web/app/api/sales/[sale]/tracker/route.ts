import { NextResponse } from 'next/server';

import { getSupabaseServiceRoleClient } from '../../../../../lib/supabase';

export async function GET(_request: Request, { params }: { params: { sale?: string } }) {
  const saleSlug = params.sale?.trim();

  if (!saleSlug) {
    return NextResponse.json({ error: 'Sale slug is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('orders')
      .select('qty')
      .eq('sale_slug', saleSlug);

    if (error) {
      console.error('[sale-tracker] Supabase query failed', { saleSlug, error });
      return NextResponse.json({ error: 'Failed to load tracker data' }, { status: 500 });
    }

    const soldCount = (data ?? []).reduce((total, row) => {
      const value = typeof row.qty === 'number' ? row.qty : Number(row.qty);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);

    return NextResponse.json(
      { saleSlug, soldCount },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=15'
        }
      }
    );
  } catch (error) {
    console.error('[sale-tracker] Unexpected failure', { saleSlug, error });
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
