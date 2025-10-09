import React, { useMemo, Suspense, lazy } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import devConsole from '../../lib/devConsole.js';

// Lazy load the entire chart component to reduce initial bundle size
const PrioritiesChart = lazy(() => import('./PrioritiesChart'));

// ----- Raw items (edit these numbers to change the budget) -----
const items = {
  fulfillment: [
    { name: 'Cheese', amount: 900 },
    { name: 'Flour', amount: 150 },
    { name: 'Other ingredients', amount: 500 },
  ],
  debt: [
    { name: 'Car', amount: 1800 },
    { name: 'Will', amount: 1500 },
    { name: 'Adam', amount: 1800 },
  ],
  equipment: [
    { name: 'Two additional ovens', amount: 1000 * 2 },
    { name: 'Assorted pizza tools', amount: 500 },
  ],
  marketing: [
    { name: 'Ads', amount: 1000 },
    { name: 'Packaging/Stickers', amount: 400 },
    { name: 'Video/Sound', amount: 1200 },
  ],
};

// Funding goal and unit price (kept for reference/consistency checks)
const GOAL = 25_000;
const PIZZA_PRICE = 15;
const PIZZAS_NEEDED = Math.ceil(GOAL / PIZZA_PRICE); // 1,667

const CATEGORY_LABEL = {
  fulfillment: 'Ingredients (Fulfillment)',
  debt: 'Debt & Operations',
  equipment: 'Equipment Upgrades',
  marketing: 'Marketing',
};

const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);

const totalsByCategory = () => ({
  fulfillment: sum(items.fulfillment),
  debt: sum(items.debt),
  equipment: sum(items.equipment),
  marketing: sum(items.marketing),
});

const tooltipFormatter = (value) => {
  const numeric = Number(value) || 0;
  return `$${numeric.toLocaleString()}`;
};

const PrioritiesPie = () => {
  const totals = useMemo(() => totalsByCategory(), []);
  const grandTotal = totals.fulfillment + totals.debt + totals.equipment + totals.marketing;

  const pieData = useMemo(
    () =>
      Object.keys(totals).map((key) => ({
        name: CATEGORY_LABEL[key],
        value: totals[key],
        key,
      })),
    [totals]
  );

  if ((import.meta?.env?.MODE || process.env.NODE_ENV) !== 'production') {
    devConsole.assert(totals.fulfillment === 1550, 'Fulfillment should total $1,550');
    devConsole.assert(totals.debt === 5100, 'Debt & Operations should total $5,100');
    devConsole.assert(totals.equipment === 2500, 'Equipment Upgrades should total $2,500');
    devConsole.assert(totals.marketing === 2600, 'Marketing should total $2,600');
    devConsole.assert(grandTotal === 11750, 'Grand total should be $11,750');
    devConsole.assert(PIZZAS_NEEDED === 1667, 'Pizzas needed should be 1,667 for a $25k goal at $15 each');
    const sumSlices = pieData.reduce((acc, slice) => acc + slice.value, 0);
    devConsole.assert(sumSlices === grandTotal, 'Pie slices should sum to the grand total');
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Priorities and Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <Suspense fallback={<div className="h-80 flex items-center justify-center">Loading chart...</div>}>
              <PrioritiesChart pieData={pieData} tooltipFormatter={tooltipFormatter} />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrioritiesPie;

export { GOAL, PIZZA_PRICE, PIZZAS_NEEDED };
