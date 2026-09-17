import { describe, expect, it, vi } from 'vitest';
import mealPrepProduction from '../mealPrepProduction.js';
import mealPrepRollup from '../../../../api-handlers/hub/meal-prep-rollup.js';

const {
  buildOperatorSheet,
  projectPlannerCard,
  resolveChangeRequest,
  resolveWeekStart,
  unassignCustomerDish,
} = mealPrepProduction;
const { buildCookLists } = mealPrepRollup._internals;

function plannerCard(id, customerName, overrides = {}) {
  return {
    id,
    supabaseUid: 'owner-1',
    title: `Meal prep — ${customerName}`,
    date: '2026-09-21',
    dayOfWeek: 'Monday',
    zone: 'Kitchen',
    objectType: 'task',
    people: [],
    revenue: 125,
    revenueCents: 12500,
    financialStatus: 'committed',
    enabled: true,
    sortOrder: 0,
    ...overrides,
  };
}

function customerMenu(card, customerName, {
  id = `menu-${card.id}`,
  status = 'committed',
  requirements = [{ key: 'dinner', label: 'Dinner', quantity: 1, min: 1, max: 1, open: false, meal: 'dinner' }],
  items = [],
  changeRequests = [],
} = {}) {
  return {
    id,
    sourcePlannerCardId: card.id,
    customerName,
    serviceDate: card.date,
    status,
    revenueCents: card.revenueCents,
    requirements,
    sourceSnapshot: projectPlannerCard(card),
    items,
    changeRequests,
  };
}

function assignedItem(id, diet = null, overrides = {}) {
  return {
    id,
    stableKey: `chef:dinner:chicken:${id}`,
    menuCycleItemId: 'dish-1',
    dishEntityId: 'entity-chicken',
    dishName: 'Roast chicken',
    meal: 'dinner',
    quantity: 1,
    diet,
    station: 'hot line',
    chef: 'Weston',
    prepDay: 'Sunday',
    origin: 'chef',
    menuCycleItem: { status: 'active', dishEntityId: 'entity-chicken' },
    ...overrides,
  };
}

function menuCycle(customerMenus, overrides = {}) {
  return {
    id: 'cycle-1',
    weekStart: '2026-09-20',
    sourceSnapshot: {
      source: 'drafts',
      sourceId: 'weekly-meal-prep:week-2026-09-20',
      notePresent: true,
      identityIssues: [],
    },
    items: [{
      id: 'dish-1',
      stableKey: 'dinner:roast-chicken:1',
      status: 'active',
      dishEntityId: 'entity-chicken',
      name: 'Roast chicken',
      meal: 'dinner',
      sortOrder: 0,
    }],
    customerMenus,
    ...overrides,
  };
}

describe('meal-prep production compilation', () => {
  it('reproduces committed planner cards exactly and keeps dietary cook runs separate', () => {
    const firstCard = plannerCard('card-1', 'Alex');
    const secondCard = plannerCard('card-2', 'Blair');
    const cycle = menuCycle([
      customerMenu(firstCard, 'Alex', { items: [assignedItem('item-1')] }),
      customerMenu(secondCard, 'Blair', { items: [assignedItem('item-2', 'gluten-free')] }),
    ]);

    const result = buildOperatorSheet({
      cycle,
      plannerCards: [firstCard, secondCard],
      generatedAt: new Date('2026-09-17T12:00:00.000Z'),
    });

    expect(result.plannerDiff).toMatchObject({
      exact: true,
      plannerCardCount: 2,
      operatorCommitmentCount: 2,
      missing: [],
      unexpected: [],
      changed: [],
    });
    expect(result.blockers).toEqual([]);
    expect(result.sheet.readiness.status).toBe('ready');
    expect(result.sheet.production.packaging).toHaveLength(2);
    expect(result.sheet.production.cook).toEqual([
      expect.objectContaining({ diet: null, quantity: 1, customers: ['Alex'] }),
      expect.objectContaining({ diet: 'gluten-free', quantity: 1, customers: ['Blair'] }),
    ]);
  });

  it('fails closed on unconfirmed commitments, ambiguous plans, extra meals, requests, and removed dishes', () => {
    const card = plannerCard('card-1', 'Alex', { financialStatus: null });
    const cycle = menuCycle([
      customerMenu(card, 'Alex', {
        status: 'planned',
        requirements: [{ key: 'dinner', label: 'Dinner', quantity: null, min: 1, max: 2, open: true, meal: 'dinner' }],
        items: [assignedItem('item-1', null, {
          meal: 'lunch',
          menuCycleItem: { status: 'removed', dishEntityId: 'entity-chicken' },
        })],
        changeRequests: [{ id: 'request-1', status: 'open', requestedAt: new Date('2026-09-17T10:00:00.000Z') }],
      }),
    ]);

    const result = buildOperatorSheet({ cycle, plannerCards: [card] });
    const codes = result.blockers.map((blocker) => blocker.code);

    expect(result.plannerDiff.exact).toBe(true);
    expect(codes).toEqual(expect.arrayContaining([
      'customer_commitment_unconfirmed',
      'customer_plan_ambiguous',
      'customer_assignments_unplanned',
      'open_change_requests',
      'assignment_removed_menu_item',
    ]));
    expect(result.sheet.readiness.status).toBe('blocked');
  });

  it('reports request and removed-dish blockers even when the customer plan is missing', () => {
    const card = plannerCard('card-1', 'Alex');
    const cycle = menuCycle([
      customerMenu(card, 'Alex', {
        requirements: [],
        items: [assignedItem('item-1', null, {
          menuCycleItem: { status: 'removed', dishEntityId: 'entity-chicken' },
        })],
        changeRequests: [{ id: 'request-1', status: 'open', requestedAt: new Date('2026-09-17T10:00:00.000Z') }],
      }),
    ]);

    const codes = buildOperatorSheet({ cycle, plannerCards: [card] }).blockers.map((blocker) => blocker.code);
    expect(codes).toEqual(expect.arrayContaining([
      'customer_plan_missing',
      'open_change_requests',
      'assignment_removed_menu_item',
    ]));
  });
});

describe('meal-prep operator boundaries', () => {
  it('snaps explicit dates to Sunday and rejects impossible dates', () => {
    expect(resolveWeekStart('2026-09-20')).toBe('2026-09-20');
    expect(resolveWeekStart('2026-09-26')).toBe('2026-09-20');
    expect(resolveWeekStart('2026-02-30')).toBeNull();
  });

  it('does not merge cook quantities across meals or dietary variants', () => {
    const lists = buildCookLists([
      {
        chef: 'Weston', day: 'Sunday', station: 'hot line', dishKey: 'dish-1',
        canonicalName: 'Roast chicken', meal: 'dinner', diet: '', qty: 1,
      },
      {
        chef: 'Weston', day: 'Sunday', station: 'hot line', dishKey: 'dish-1',
        canonicalName: 'Roast chicken', meal: 'dinner', diet: 'gluten-free', qty: 2,
      },
      {
        chef: 'Weston', day: 'Sunday', station: 'hot line', dishKey: 'dish-1',
        canonicalName: 'Roast chicken', meal: 'lunch', diet: '', qty: 3,
      },
    ]);

    expect(lists[0].days[0].stations[0].dishes).toEqual([
      { name: 'Roast chicken', meal: 'dinner', diet: '', qty: 1 },
      { name: 'Roast chicken', meal: 'dinner', diet: 'gluten-free', qty: 2 },
      { name: 'Roast chicken', meal: 'lunch', diet: '', qty: 3 },
    ]);
  });
});

describe('meal-prep correction lifecycle', () => {
  it('removes one exact customer assignment', async () => {
    const card = plannerCard('card-1', 'Alex');
    const assignment = assignedItem('item-1');
    const cycle = menuCycle([customerMenu(card, 'Alex', { items: [assignment] })]);
    const remove = vi.fn(async () => assignment);
    const prisma = {
      mealPrepMenuCycle: { findUnique: vi.fn(async () => cycle) },
      mealPrepCustomerMenuItem: { delete: remove },
    };

    await expect(unassignCustomerDish({
      prisma,
      weekStart: '2026-09-20',
      customerName: 'Alex',
      dishName: 'Roast chicken',
      meal: 'dinner',
    })).resolves.toBe(assignment);
    expect(remove).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });

  it('resolves an open customer change request with an auditable disposition', async () => {
    const card = plannerCard('card-1', 'Alex');
    const request = {
      id: 'request-1',
      requestKey: 'key-1',
      status: 'open',
      requestedChange: 'No dairy',
      resolution: null,
    };
    const cycle = menuCycle([
      customerMenu(card, 'Alex', { changeRequests: [request] }),
    ]);
    const update = vi.fn(async ({ data }) => ({ ...request, ...data }));
    const prisma = {
      mealPrepMenuCycle: { findUnique: vi.fn(async () => cycle) },
      mealPrepChangeRequest: { update },
    };

    const result = await resolveChangeRequest({
      prisma,
      weekStart: '2026-09-20',
      customerName: 'Alex',
      requestId: 'request-1',
      resolution: 'Assigned the dairy-free menu variant',
    });

    expect(result).toMatchObject({
      id: 'request-1',
      status: 'resolved',
      resolution: 'Assigned the dairy-free menu variant',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: {
        status: 'resolved',
        resolvedAt: expect.any(Date),
        resolution: 'Assigned the dairy-free menu variant',
      },
    });
  });
});
