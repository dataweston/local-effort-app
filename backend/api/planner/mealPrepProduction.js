'use strict';

const crypto = require('node:crypto');
const { parseMealMenu } = require('../../../api-handlers/hub/_mealMenuParse');
const { resolveDishNames, resolveOrCreateDishes } = require('../brain/dishResolver');

const NOTE_SOURCE = 'drafts';
const NOTE_TIMEZONE = 'America/Chicago';
const MEAL_PREP_TITLE = /^meal prep\s*[—–-]\s*/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MEALS = new Set(['dinner', 'lunch', 'breakfast', 'kids', 'snacks', 'other']);

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validIsoDate(value) {
  if (!ISO_DATE.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: NOTE_TIMEZONE });
}

// Match the Weekly Meal Prep tab: after Monday, an omitted date points at the
// coming Sunday. An explicit date is always snapped back to its Sunday.
function resolveWeekStart(dateIso) {
  const base = dateIso || localToday();
  if (!validIsoDate(base)) return null;
  const day = new Date(`${base}T00:00:00Z`).getUTCDay();
  let sunday = addDaysIso(base, -day);
  if (!dateIso && base > addDaysIso(sunday, 1)) sunday = addDaysIso(sunday, 7);
  return sunday;
}

function menuSourceId(weekStart) {
  return `weekly-meal-prep:week-${weekStart}`;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function slug(value) {
  return normalizeName(value).replace(/\s+/g, '-') || 'unnamed';
}

function jsonValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, jsonValue(value[key])]),
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(jsonValue(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function asIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeMeal(value) {
  const normalized = normalizeName(value);
  if (/^dinners?$/.test(normalized)) return 'dinner';
  if (/^lunch(es)?$/.test(normalized)) return 'lunch';
  if (/^breakfasts?$/.test(normalized)) return 'breakfast';
  if (/^(kid|kids|kids meal|kids meals|kids food)$/.test(normalized)) return 'kids';
  if (/^snacks?$/.test(normalized)) return 'snacks';
  return MEALS.has(normalized) ? normalized : 'other';
}

function isMealPrepCard(card) {
  return Boolean(card && card.enabled !== false && MEAL_PREP_TITLE.test(String(card.title || '')));
}

function plannerRevenueCents(card) {
  if (Number.isInteger(card?.revenueCents)) return Math.max(0, card.revenueCents);
  const dollars = Number(card?.revenue || 0);
  return Number.isFinite(dollars) ? Math.max(0, Math.round(dollars * 100)) : 0;
}

function projectPlannerCard(card) {
  return jsonValue({
    id: card.id,
    supabaseUid: card.supabaseUid,
    templateId: card.templateId || null,
    title: card.title,
    date: card.date,
    dayOfWeek: card.dayOfWeek,
    zone: card.zone,
    objectType: card.objectType || null,
    people: Array.isArray(card.people) ? card.people : [],
    startTime: card.startTime || null,
    endTime: card.endTime || null,
    revenue: Number(card.revenue || 0),
    revenueCents: plannerRevenueCents(card),
    cashReceivedCents: Number(card.cashReceivedCents || 0),
    cost: Number(card.cost || 0),
    costCents: Number.isInteger(card.costCents) ? card.costCents : null,
    costPerHour: Number.isInteger(card.costPerHour) ? card.costPerHour : null,
    costPerHourCents: Number.isInteger(card.costPerHourCents) ? card.costPerHourCents : null,
    financialStatus: card.financialStatus || null,
    financialSource: card.financialSource || null,
    financialMetadata: card.financialMetadata || null,
    notes: card.notes || null,
    optional: Boolean(card.optional),
    enabled: card.enabled !== false,
    effectTarget: card.effectTarget || null,
    effectType: card.effectType || null,
    sortOrder: Number(card.sortOrder || 0),
    status: card.status || null,
    projectId: card.projectId || null,
    assigneeId: card.assigneeId || null,
    priority: Number(card.priority || 0),
    dueDate: card.dueDate || null,
    createdAt: asIso(card.createdAt),
    updatedAt: asIso(card.updatedAt),
  });
}

function customerNameForCard(card) {
  const metadataName = card?.financialMetadata && typeof card.financialMetadata === 'object'
    ? card.financialMetadata.billingCustomerName
    : null;
  if (String(metadataName || '').trim()) return String(metadataName).trim();
  return String(card?.title || '')
    .replace(MEAL_PREP_TITLE, '')
    .split(':')[0]
    .trim();
}

function customerMenuStatus(card) {
  if (card.financialStatus === 'paused_pending_confirmation') return 'paused';
  if (card.financialStatus === 'committed') return 'committed';
  return 'planned';
}

function deriveRequirements(plan) {
  if (!plan || typeof plan !== 'object') return [];
  const requirements = [];
  if (plan.sections && typeof plan.sections === 'object' && !Array.isArray(plan.sections)) {
    for (const [key, section] of Object.entries(plan.sections)) {
      const rule = section && typeof section === 'object' ? section : {};
      const quantity = Number.isInteger(rule.qty) && rule.qty >= 0 ? rule.qty : null;
      requirements.push({
        key,
        label: rule.label || key,
        quantity,
        min: Number.isInteger(rule.min) ? rule.min : quantity,
        max: Number.isInteger(rule.max) ? rule.max : quantity,
        open: Boolean(rule.open) || quantity === null,
        meal: normalizeMeal(rule.menuCategory || key),
        style: rule.style || null,
        servesAdults: Number.isInteger(rule.servesAdults) ? rule.servesAdults : null,
        servesKids: Number.isInteger(rule.servesKids) ? rule.servesKids : null,
      });
    }
  } else if (plan.sectionRules && typeof plan.sectionRules === 'object' && !Array.isArray(plan.sectionRules)) {
    for (const [key, section] of Object.entries(plan.sectionRules)) {
      const rule = section && typeof section === 'object' ? section : {};
      const exact = Number.isInteger(rule.min) && rule.min === rule.max ? rule.min : null;
      requirements.push({
        key,
        label: rule.label || key,
        quantity: exact,
        min: Number.isInteger(rule.min) ? rule.min : null,
        max: Number.isInteger(rule.max) ? rule.max : null,
        open: exact === null,
        meal: normalizeMeal(rule.menuCategory || key),
        style: rule.style || null,
        servesAdults: null,
        servesKids: null,
      });
    }
  }
  return requirements.sort((a, b) => a.key.localeCompare(b.key));
}

function stableMenuItems(parsed, resolutions) {
  const occurrences = new Map();
  return parsed.map((dish, index) => {
    const base = `${normalizeMeal(dish.meal)}:${slug(dish.name)}`;
    const occurrence = (occurrences.get(base) || 0) + 1;
    occurrences.set(base, occurrence);
    const resolution = resolutions[index] || {};
    const stableKey = `${base}:${occurrence}`;
    const record = {
      stableKey,
      status: 'active',
      dishEntityId: resolution.dishEntityId || null,
      name: dish.name,
      description: dish.description || null,
      meal: normalizeMeal(dish.meal),
      sortOrder: index,
      resolution: {
        resolved: Boolean(resolution.dishEntityId),
        canonicalName: resolution.name || null,
        confidence: Number(resolution.confidence || 0),
        method: resolution.method || 'none',
        created: Boolean(resolution.created),
        candidates: resolution.candidates || [],
      },
    };
    record.sourceHash = sha256({
      stableKey: record.stableKey,
      dishEntityId: record.dishEntityId,
      name: record.name,
      description: record.description,
      meal: record.meal,
      sortOrder: record.sortOrder,
    });
    return record;
  });
}

function identityForCustomer(customerName, customers, entities) {
  const canonical = normalizeName(customerName);
  const localMatches = customers.filter((customer) =>
    normalizeName(customer.name) === canonical || normalizeName(customer.slug) === canonical);
  let customer = localMatches.length === 1 ? localMatches[0] : null;

  const linkedEntities = customer
    ? entities.filter((entity) => entity.localEffortCustomerId === customer.id)
    : [];
  const namedEntities = entities.filter((entity) =>
    normalizeName(entity.canonicalName || entity.name) === canonical || normalizeName(entity.name) === canonical);
  const entityPool = linkedEntities.length ? linkedEntities : namedEntities;
  const entity = entityPool.length === 1 ? entityPool[0] : null;

  if (!customer && entity?.localEffortCustomerId) {
    customer = customers.find((candidate) => candidate.id === entity.localEffortCustomerId) || null;
  }

  const issues = [];
  if (localMatches.length > 1) issues.push({ type: 'customer_identity_ambiguous', customerName, system: 'Customer', matches: localMatches.map((row) => row.id) });
  if (entityPool.length > 1) issues.push({ type: 'customer_identity_ambiguous', customerName, system: 'BrainEntity', matches: entityPool.map((row) => row.id) });
  if (!customer && !entity) issues.push({ type: 'customer_identity_unmatched', customerName });

  const planSnapshot = customer?.planRulesJson || entity?.properties?.mealPrepPlan || null;
  return {
    customerId: customer?.id || null,
    brainCustomerEntityId: entity?.id || null,
    planSnapshot,
    requirements: deriveRequirements(planSnapshot),
    issues,
  };
}

function proposedCustomerMenus(cards, customers, entities) {
  const identityIssues = [];
  const menus = cards.map((card) => {
    const customerName = customerNameForCard(card);
    const identity = identityForCustomer(customerName, customers, entities);
    identityIssues.push(...identity.issues.map((issue) => ({ plannerCardId: card.id, ...issue })));
    const sourceSnapshot = projectPlannerCard(card);
    return {
      id: `proposed:${card.id}`,
      sourcePlannerCardId: card.id,
      customerId: identity.customerId,
      brainCustomerEntityId: identity.brainCustomerEntityId,
      customerName,
      serviceDate: card.date,
      status: customerMenuStatus(card),
      revenueCents: plannerRevenueCents(card),
      planSnapshot: identity.planSnapshot,
      requirements: identity.requirements,
      sourceSnapshot,
      sourceHash: sha256(sourceSnapshot),
      items: [],
      changeRequests: [],
    };
  });
  return { menus, identityIssues };
}

function projectionChanges(expected, actual) {
  const keys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);
  return [...keys]
    .sort()
    .filter((key) => stableStringify(expected?.[key]) !== stableStringify(actual?.[key]));
}

function diffPlannerCards(plannerCards, commitments) {
  const expected = new Map(plannerCards.map((card) => [card.id, projectPlannerCard(card)]));
  const actual = new Map(commitments.map((commitment) => [commitment.sourcePlannerCardId, commitment.plannerCard]));
  const missing = [...expected.keys()].filter((id) => !actual.has(id)).sort();
  const unexpected = [...actual.keys()].filter((id) => !expected.has(id)).sort();
  const changed = [...expected.keys()]
    .filter((id) => actual.has(id))
    .map((id) => ({ plannerCardId: id, fields: projectionChanges(expected.get(id), actual.get(id)) }))
    .filter((entry) => entry.fields.length > 0)
    .sort((a, b) => a.plannerCardId.localeCompare(b.plannerCardId));
  return {
    exact: missing.length === 0 && unexpected.length === 0 && changed.length === 0,
    plannerCardCount: expected.size,
    operatorCommitmentCount: actual.size,
    missing,
    unexpected,
    changed,
  };
}

function groupProductionItems(commitments) {
  const flat = commitments.flatMap((commitment) => commitment.items.map((item) => ({
    ...item,
    customerMenuId: commitment.customerMenuId,
    customerName: commitment.customerName,
    serviceDate: commitment.serviceDate,
  })));

  const aggregate = (keyFor, rowFor) => {
    const grouped = new Map();
    for (const item of flat) {
      const key = keyFor(item);
      const existing = grouped.get(key) || rowFor(item);
      existing.quantity += item.quantity;
      if (!existing.customers.includes(item.customerName)) existing.customers.push(item.customerName);
      grouped.set(key, existing);
    }
    return [...grouped.values()]
      .map((row) => ({ ...row, customers: row.customers.sort() }))
      .sort((a, b) => `${a.prepDay || ''}:${a.meal}:${a.dishName}`.localeCompare(`${b.prepDay || ''}:${b.meal}:${b.dishName}`));
  };

  const packaging = aggregate(
    (item) => [item.dishEntityId || normalizeName(item.dishName), item.meal, item.diet || ''].join('|'),
    (item) => ({
      dishEntityId: item.dishEntityId,
      dishName: item.dishName,
      meal: item.meal,
      diet: item.diet,
      quantity: 0,
      customers: [],
    }),
  );
  const cook = aggregate(
    (item) => [
      item.dishEntityId || normalizeName(item.dishName),
      item.meal,
      item.diet || '',
      item.station || '',
      item.chef || '',
      item.prepDay || '',
    ].join('|'),
    (item) => ({
      dishEntityId: item.dishEntityId,
      dishName: item.dishName,
      meal: item.meal,
      diet: item.diet,
      station: item.station,
      chef: item.chef,
      prepDay: item.prepDay,
      quantity: 0,
      customers: [],
    }),
  );
  const bags = commitments
    .filter((commitment) => commitment.items.length)
    .map((commitment) => ({
      customerMenuId: commitment.customerMenuId,
      customerName: commitment.customerName,
      serviceDate: commitment.serviceDate,
      itemCount: commitment.items.reduce((sum, item) => sum + item.quantity, 0),
      items: commitment.items,
    }));

  return { packaging, cook, bags };
}

function requirementTotals(requirements) {
  const totals = new Map();
  for (const requirement of requirements || []) {
    if (!Number.isInteger(requirement.quantity)) continue;
    totals.set(requirement.meal, (totals.get(requirement.meal) || 0) + requirement.quantity);
  }
  return totals;
}

function assignmentTotals(items) {
  const totals = new Map();
  for (const item of items || []) totals.set(item.meal, (totals.get(item.meal) || 0) + item.quantity);
  return totals;
}

function buildBlockers({ cycle, commitments, plannerDiff }) {
  const blockers = [];
  const source = cycle.sourceSnapshot || {};
  if (!source.notePresent) blockers.push({ code: 'menu_source_missing', message: `No weekly menu note exists for ${cycle.weekStart}.` });
  else if (!cycle.items.length) blockers.push({ code: 'menu_source_empty', message: 'The weekly menu note contains no parsed dishes.' });

  const unresolved = cycle.items.filter((item) => !item.dishEntityId);
  if (unresolved.length) {
    blockers.push({
      code: 'menu_dishes_unresolved',
      message: `${unresolved.length} menu dish${unresolved.length === 1 ? '' : 'es'} lack a canonical Dish identity.`,
      itemKeys: unresolved.map((item) => item.stableKey),
    });
  }

  for (const issue of source.identityIssues || []) blockers.push({ code: issue.type, ...issue });
  if (!commitments.length) blockers.push({ code: 'planner_commitments_missing', message: 'No enabled meal-prep planner cards exist in this week.' });

  for (const commitment of commitments) {
    if (commitment.status === 'paused') {
      blockers.push({
        code: 'customer_commitment_paused',
        plannerCardId: commitment.sourcePlannerCardId,
        customerName: commitment.customerName,
      });
    } else if (commitment.status !== 'committed') {
      blockers.push({
        code: 'customer_commitment_unconfirmed',
        plannerCardId: commitment.sourcePlannerCardId,
        customerName: commitment.customerName,
        status: commitment.status,
      });
    }

    if (!commitment.requirements.length) {
      blockers.push({
        code: 'customer_plan_missing',
        plannerCardId: commitment.sourcePlannerCardId,
        customerName: commitment.customerName,
        message: 'No exact meal-prep plan is attached to this customer identity.',
      });
    } else {
      const ambiguous = commitment.requirements.filter((requirement) =>
        requirement.open || !Number.isInteger(requirement.quantity));
      if (ambiguous.length) {
        blockers.push({
          code: 'customer_plan_ambiguous',
          plannerCardId: commitment.sourcePlannerCardId,
          customerName: commitment.customerName,
          requirementKeys: ambiguous.map((requirement) => requirement.key),
          message: 'The customer plan contains quantities that are not exact.',
        });
      }

      const exactRequirements = commitment.requirements.filter((requirement) =>
        !requirement.open && Number.isInteger(requirement.quantity));
      const expected = requirementTotals(exactRequirements);
      const actual = assignmentTotals(commitment.items);
      for (const [meal, quantity] of expected) {
        const assigned = actual.get(meal) || 0;
        if (assigned !== quantity) {
          blockers.push({
            code: 'customer_assignments_incomplete',
            plannerCardId: commitment.sourcePlannerCardId,
            customerName: commitment.customerName,
            meal,
            requiredQuantity: quantity,
            assignedQuantity: assigned,
          });
        }
      }
      const plannedMeals = new Set(commitment.requirements.map((requirement) => requirement.meal));
      const unplannedMeals = [...actual.entries()]
        .filter(([meal, quantity]) => quantity > 0 && !plannedMeals.has(meal))
        .map(([meal, quantity]) => ({ meal, assignedQuantity: quantity }));
      if (unplannedMeals.length) {
        blockers.push({
          code: 'customer_assignments_unplanned',
          plannerCardId: commitment.sourcePlannerCardId,
          customerName: commitment.customerName,
          assignments: unplannedMeals,
        });
      }
    }

    const openRequests = commitment.changeRequests.filter((request) => request.status === 'open');
    if (openRequests.length) {
      blockers.push({
        code: 'open_change_requests',
        plannerCardId: commitment.sourcePlannerCardId,
        customerName: commitment.customerName,
        requestIds: openRequests.map((request) => request.id),
      });
    }
    const removedAssignments = commitment.items.filter((item) => item.menuItemStatus === 'removed');
    if (removedAssignments.length) {
      blockers.push({
        code: 'assignment_removed_menu_item',
        plannerCardId: commitment.sourcePlannerCardId,
        customerName: commitment.customerName,
        itemIds: removedAssignments.map((item) => item.id),
      });
    }
  }
  if (!plannerDiff.exact) blockers.push({ code: 'planner_card_diff', ...plannerDiff });
  return blockers;
}

function canonicalItem(item) {
  return {
    id: item.id,
    stableKey: item.stableKey,
    menuCycleItemId: item.menuCycleItemId || null,
    menuItemStatus: item.menuCycleItem?.status || null,
    dishEntityId: item.dishEntityId || item.menuCycleItem?.dishEntityId || null,
    dishName: item.dishName,
    meal: normalizeMeal(item.meal),
    quantity: Number(item.quantity || 0),
    diet: item.diet || null,
    station: item.station || null,
    chef: item.chef || null,
    prepDay: item.prepDay || null,
    notes: item.notes || null,
    origin: item.origin || 'chef',
    chefEditedAt: asIso(item.chefEditedAt),
  };
}

function buildOperatorSheet({ cycle, plannerCards, generatedAt = new Date() }) {
  const commitments = (cycle.customerMenus || [])
    .filter((menu) => menu.status !== 'removed')
    .map((menu) => ({
      customerMenuId: menu.id,
      sourcePlannerCardId: menu.sourcePlannerCardId,
      customerId: menu.customerId || null,
      brainCustomerEntityId: menu.brainCustomerEntityId || null,
      customerName: menu.customerName,
      serviceDate: menu.serviceDate,
      status: menu.status,
      revenueCents: menu.revenueCents,
      requirements: Array.isArray(menu.requirements) ? menu.requirements : [],
      plannerCard: menu.sourceSnapshot,
      items: (menu.items || []).map(canonicalItem).sort((a, b) => `${a.meal}:${a.dishName}`.localeCompare(`${b.meal}:${b.dishName}`)),
      changeRequests: (menu.changeRequests || [])
        .map((request) => ({
          id: request.id,
          requestKey: request.requestKey,
          status: request.status,
          requestedChange: request.requestedChange,
          source: request.source,
          sourceReference: request.sourceReference || null,
          requestedAt: asIso(request.requestedAt),
          resolvedAt: asIso(request.resolvedAt),
          resolution: request.resolution || null,
        }))
        .sort((a, b) => `${a.requestedAt}:${a.id}`.localeCompare(`${b.requestedAt}:${b.id}`)),
    }))
    .sort((a, b) => `${a.serviceDate}:${a.customerName}:${a.sourcePlannerCardId}`.localeCompare(`${b.serviceDate}:${b.customerName}:${b.sourcePlannerCardId}`));

  const plannerDiff = diffPlannerCards(plannerCards, commitments);
  const blockers = buildBlockers({ cycle, commitments, plannerDiff });
  const production = groupProductionItems(commitments);
  const sheet = {
    contractVersion: 1,
    generatedAt: asIso(generatedAt),
    weekStart: cycle.weekStart,
    weekEnd: addDaysIso(cycle.weekStart, 6),
    menuCycleId: cycle.id,
    menuSource: cycle.sourceSnapshot,
    menuItems: cycle.items.map((item) => ({
      id: item.id,
      stableKey: item.stableKey,
      dishEntityId: item.dishEntityId || null,
      name: item.name,
      description: item.description || null,
      meal: item.meal,
      sortOrder: item.sortOrder,
    })),
    commitments,
    production,
    readiness: {
      status: blockers.length ? 'blocked' : 'ready',
      blockerCount: blockers.length,
      commitmentCount: commitments.length,
      assignedLineCount: commitments.reduce((sum, commitment) => sum + commitment.items.length, 0),
      plannerCardsExact: plannerDiff.exact,
    },
  };
  return { sheet, plannerDiff, blockers };
}

function batchSourceHash(compiled) {
  return sha256({
    sheet: { ...compiled.sheet, generatedAt: null },
    plannerDiff: compiled.plannerDiff,
    blockers: compiled.blockers,
  });
}

async function loadWeekEvidence(prisma, weekStart, { supabaseUid = null, createMissingDishes = false, createdBy = 'meal-prep-production' } = {}) {
  if (!prisma) throw new Error('Database unavailable');
  if (!validIsoDate(weekStart)) throw new Error('Invalid weekStart (expected YYYY-MM-DD)');
  const weekEnd = addDaysIso(weekStart, 6);
  const [document, rawCards] = await Promise.all([
    prisma.hubDocument.findUnique({
      where: { source_sourceId: { source: NOTE_SOURCE, sourceId: menuSourceId(weekStart) } },
      select: { id: true, title: true, body: true, status: true, updatedAt: true },
    }),
    prisma.plannerCard.findMany({
      where: {
        date: { gte: weekStart, lte: weekEnd },
        enabled: true,
        ...(supabaseUid ? { supabaseUid } : {}),
      },
      orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const plannerCards = rawCards.filter(isMealPrepCard);
  const ownerIds = [...new Set(plannerCards.map((card) => card.supabaseUid))];
  if (!supabaseUid && ownerIds.length > 1) {
    throw new Error(`Meal-prep cards span ${ownerIds.length} planner owners; pass --uid explicitly.`);
  }

  const names = plannerCards.map(customerNameForCard).filter(Boolean);
  const nameQueries = names.map((name) => ({ name: { equals: name, mode: 'insensitive' } }));
  const slugQueries = names.map((name) => ({ slug: slug(name) }));
  const entityQueries = names.flatMap((name) => [
    { name: { equals: name, mode: 'insensitive' } },
    { canonicalName: normalizeName(name) },
  ]);
  const [customers, entities] = await Promise.all([
    names.length
      ? prisma.customer.findMany({
        where: { OR: [...nameQueries, ...slugQueries] },
        select: { id: true, slug: true, name: true, planRulesJson: true },
      })
      : [],
    names.length
      ? prisma.brainEntity.findMany({
        where: { entityType: 'Customer', tombstonedAt: null, OR: entityQueries },
        select: { id: true, name: true, canonicalName: true, properties: true, localEffortCustomerId: true },
      })
      : [],
  ]);

  // A linked BrainEntity may be named differently from its planner billing name.
  // Pull it by Customer id as a second exact join, never by fuzzy matching.
  const customerIds = customers.map((customer) => customer.id);
  if (customerIds.length) {
    const linked = await prisma.brainEntity.findMany({
      where: { entityType: 'Customer', tombstonedAt: null, localEffortCustomerId: { in: customerIds } },
      select: { id: true, name: true, canonicalName: true, properties: true, localEffortCustomerId: true },
    });
    const seen = new Set(entities.map((entity) => entity.id));
    for (const entity of linked) if (!seen.has(entity.id)) entities.push(entity);
  }

  const parsed = parseMealMenu(document?.body || '');
  const dishNames = parsed.map((dish) => dish.name);
  const resolutions = createMissingDishes
    ? await resolveOrCreateDishes(dishNames, { prisma, createdBy, menuContext: { weekStart, sourceDocumentId: document?.id || null } })
    : await resolveDishNames(dishNames, { prisma });
  const items = stableMenuItems(parsed, resolutions);
  const customerState = proposedCustomerMenus(plannerCards, customers, entities);
  const sourceSnapshot = {
    source: NOTE_SOURCE,
    sourceId: menuSourceId(weekStart),
    notePresent: Boolean(document),
    documentId: document?.id || null,
    title: document?.title || null,
    status: document?.status || null,
    updatedAt: asIso(document?.updatedAt),
    bodyHash: document ? sha256(document.body || '') : null,
    parsedDishCount: items.length,
    plannerOwnerUid: supabaseUid || ownerIds[0] || null,
    identityIssues: customerState.identityIssues,
  };

  return { document, plannerCards, items, customerMenus: customerState.menus, sourceSnapshot };
}

function proposedCycle(weekStart, evidence) {
  return {
    id: `proposed:${weekStart}`,
    weekStart,
    status: 'draft',
    sourceDocumentId: evidence.document?.id || null,
    sourceUpdatedAt: evidence.document?.updatedAt || null,
    sourceBodyHash: evidence.sourceSnapshot.bodyHash,
    sourceSnapshot: evidence.sourceSnapshot,
    items: evidence.items.map((item) => ({ id: `proposed:${item.stableKey}`, ...item })),
    customerMenus: evidence.customerMenus,
  };
}

async function persistedCycle(tx, id) {
  return tx.mealPrepMenuCycle.findUnique({
    where: { id },
    include: {
      items: { where: { status: 'active' }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      customerMenus: {
        where: { status: { not: 'removed' } },
        orderBy: [{ serviceDate: 'asc' }, { customerName: 'asc' }],
        include: {
          items: { include: { menuCycleItem: true }, orderBy: [{ meal: 'asc' }, { dishName: 'asc' }] },
          changeRequests: { orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }] },
        },
      },
    },
  });
}

async function persistEvidence(prisma, weekStart, evidence) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    let cycle = await tx.mealPrepMenuCycle.upsert({
      where: { weekStart },
      update: {
        sourceDocumentId: evidence.document?.id || null,
        sourceUpdatedAt: evidence.document?.updatedAt || null,
        sourceBodyHash: evidence.sourceSnapshot.bodyHash,
        sourceSnapshot: evidence.sourceSnapshot,
        lastSyncedAt: now,
      },
      create: {
        weekStart,
        status: 'draft',
        sourceDocumentId: evidence.document?.id || null,
        sourceUpdatedAt: evidence.document?.updatedAt || null,
        sourceBodyHash: evidence.sourceSnapshot.bodyHash,
        sourceSnapshot: evidence.sourceSnapshot,
        lastSyncedAt: now,
      },
    });

    for (const item of evidence.items) {
      await tx.mealPrepMenuCycleItem.upsert({
        where: { menuCycleId_stableKey: { menuCycleId: cycle.id, stableKey: item.stableKey } },
        update: {
          status: 'active',
          dishEntityId: item.dishEntityId,
          name: item.name,
          description: item.description,
          meal: item.meal,
          sortOrder: item.sortOrder,
          sourceHash: item.sourceHash,
        },
        create: {
          menuCycleId: cycle.id,
          stableKey: item.stableKey,
          status: 'active',
          dishEntityId: item.dishEntityId,
          name: item.name,
          description: item.description,
          meal: item.meal,
          sortOrder: item.sortOrder,
          sourceHash: item.sourceHash,
        },
      });
    }
    await tx.mealPrepMenuCycleItem.updateMany({
      where: {
        menuCycleId: cycle.id,
        ...(evidence.items.length ? { stableKey: { notIn: evidence.items.map((item) => item.stableKey) } } : {}),
      },
      data: { status: 'removed' },
    });

    for (const menu of evidence.customerMenus) {
      await tx.mealPrepCustomerMenu.upsert({
        where: { sourcePlannerCardId: menu.sourcePlannerCardId },
        update: {
          menuCycleId: cycle.id,
          customerId: menu.customerId,
          brainCustomerEntityId: menu.brainCustomerEntityId,
          customerName: menu.customerName,
          serviceDate: menu.serviceDate,
          status: menu.status,
          revenueCents: menu.revenueCents,
          planSnapshot: menu.planSnapshot,
          requirements: menu.requirements,
          sourceSnapshot: menu.sourceSnapshot,
          sourceHash: menu.sourceHash,
          lastSyncedAt: now,
          // Intentionally do not replace items or changeRequests. They are chef
          // edits and customer evidence, not generated planner projections.
        },
        create: {
          menuCycleId: cycle.id,
          sourcePlannerCardId: menu.sourcePlannerCardId,
          customerId: menu.customerId,
          brainCustomerEntityId: menu.brainCustomerEntityId,
          customerName: menu.customerName,
          serviceDate: menu.serviceDate,
          status: menu.status,
          revenueCents: menu.revenueCents,
          planSnapshot: menu.planSnapshot,
          requirements: menu.requirements,
          sourceSnapshot: menu.sourceSnapshot,
          sourceHash: menu.sourceHash,
          lastSyncedAt: now,
        },
      });
    }
    await tx.mealPrepCustomerMenu.updateMany({
      where: {
        menuCycleId: cycle.id,
        ...(evidence.customerMenus.length
          ? { sourcePlannerCardId: { notIn: evidence.customerMenus.map((menu) => menu.sourcePlannerCardId) } }
          : {}),
      },
      data: { status: 'removed', lastSyncedAt: now },
    });

    cycle = await persistedCycle(tx, cycle.id);
    const compiled = buildOperatorSheet({ cycle, plannerCards: evidence.plannerCards, generatedAt: now });
    const sourceHash = batchSourceHash(compiled);
    let batch = await tx.mealPrepProductionBatch.findUnique({
      where: { menuCycleId_sourceHash: { menuCycleId: cycle.id, sourceHash } },
    });
    let reused = true;
    if (!batch) {
      const latest = await tx.mealPrepProductionBatch.aggregate({
        where: { menuCycleId: cycle.id },
        _max: { version: true },
      });
      batch = await tx.mealPrepProductionBatch.create({
        data: {
          menuCycleId: cycle.id,
          version: (latest._max.version || 0) + 1,
          status: compiled.blockers.length ? 'blocked' : 'ready',
          sourceHash,
          operatorSheet: compiled.sheet,
          blockers: compiled.blockers,
          plannerDiff: compiled.plannerDiff,
          generatedAt: now,
        },
      });
      reused = false;
    }
    await tx.mealPrepMenuCycle.update({
      where: { id: cycle.id },
      data: { status: compiled.blockers.length ? 'blocked' : 'ready' },
    });

    return { cycle, batch, reused, ...compiled };
  }, { timeout: 60_000 });
}

async function syncMealPrepWeek({
  prisma,
  weekStart: requestedWeekStart,
  supabaseUid = null,
  apply = false,
  createdBy = 'meal-prep-production',
  createMissingDishes = apply,
} = {}) {
  const weekStart = resolveWeekStart(requestedWeekStart);
  if (!weekStart) throw new Error('Invalid weekStart (expected YYYY-MM-DD)');
  const evidence = await loadWeekEvidence(prisma, weekStart, { supabaseUid, createMissingDishes, createdBy });
  if (!apply) {
    const cycle = proposedCycle(weekStart, evidence);
    const compiled = buildOperatorSheet({ cycle, plannerCards: evidence.plannerCards });
    return {
      mode: 'dry-run',
      weekStart,
      cycle,
      batch: null,
      reused: false,
      ...compiled,
    };
  }
  const result = await persistEvidence(prisma, weekStart, evidence);
  return { mode: 'applied', weekStart, ...result };
}

async function loadCanonicalWeek(prisma, requestedWeekStart) {
  const weekStart = resolveWeekStart(requestedWeekStart);
  if (!weekStart) throw new Error('Invalid weekStart (expected YYYY-MM-DD)');
  const cycle = await prisma.mealPrepMenuCycle.findUnique({
    where: { weekStart },
    include: {
      items: { where: { status: 'active' }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      customerMenus: {
        where: { status: { not: 'removed' } },
        orderBy: [{ serviceDate: 'asc' }, { customerName: 'asc' }],
        include: {
          items: { include: { menuCycleItem: true }, orderBy: [{ meal: 'asc' }, { dishName: 'asc' }] },
          changeRequests: { orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }] },
        },
      },
      productionBatches: { orderBy: { version: 'desc' }, take: 1 },
    },
  });
  return { weekStart, cycle };
}

async function assignCustomerDish({
  prisma,
  weekStart: requestedWeekStart,
  customerName,
  dishName,
  quantity = 1,
  meal = null,
  diet = null,
  station = null,
  chef = null,
  prepDay = null,
  notes = null,
} = {}) {
  const { weekStart, cycle } = await loadCanonicalWeek(prisma, requestedWeekStart);
  if (!cycle) throw new Error(`No canonical meal-prep cycle exists for ${weekStart}; apply sync first.`);
  const menus = cycle.customerMenus.filter((menu) => normalizeName(menu.customerName) === normalizeName(customerName));
  if (menus.length !== 1) throw new Error(`Expected one exact customer menu for "${customerName}"; found ${menus.length}.`);
  const dishes = cycle.items.filter((item) =>
    normalizeName(item.name) === normalizeName(dishName) ||
    (item.dishEntityId && item.dishEntityId === dishName));
  if (dishes.length !== 1) throw new Error(`Expected one exact active menu dish for "${dishName}"; found ${dishes.length}.`);
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) throw new Error('quantity must be a positive integer');
  const menu = menus[0];
  const dish = dishes[0];
  const resolvedMeal = meal ? normalizeMeal(meal) : dish.meal;
  const stableKey = `chef:${dish.stableKey}:${resolvedMeal}`;
  const fields = {
    menuCycleItemId: dish.id,
    dishEntityId: dish.dishEntityId,
    dishName: dish.name,
    meal: resolvedMeal,
    quantity: parsedQuantity,
    diet: diet || null,
    station: station || null,
    chef: chef || null,
    prepDay: prepDay || null,
    notes: notes || null,
    origin: 'chef',
    chefEditedAt: new Date(),
  };
  return prisma.mealPrepCustomerMenuItem.upsert({
    where: { customerMenuId_stableKey: { customerMenuId: menu.id, stableKey } },
    update: { ...fields, sourceHash: sha256(fields) },
    create: { customerMenuId: menu.id, stableKey, ...fields, sourceHash: sha256(fields) },
  });
}

async function unassignCustomerDish({
  prisma,
  weekStart: requestedWeekStart,
  customerName,
  dishName,
  meal = null,
} = {}) {
  const { weekStart, cycle } = await loadCanonicalWeek(prisma, requestedWeekStart);
  if (!cycle) throw new Error(`No canonical meal-prep cycle exists for ${weekStart}; apply sync first.`);
  const menus = cycle.customerMenus.filter((menu) => normalizeName(menu.customerName) === normalizeName(customerName));
  if (menus.length !== 1) throw new Error(`Expected one exact customer menu for "${customerName}"; found ${menus.length}.`);
  const normalizedMeal = meal ? normalizeMeal(meal) : null;
  const assignments = menus[0].items.filter((item) =>
    (normalizeName(item.dishName) === normalizeName(dishName) || item.dishEntityId === dishName)
    && (!normalizedMeal || normalizeMeal(item.meal) === normalizedMeal));
  if (assignments.length !== 1) {
    throw new Error(`Expected one exact customer assignment for "${dishName}"; found ${assignments.length}.`);
  }
  return prisma.mealPrepCustomerMenuItem.delete({ where: { id: assignments[0].id } });
}

async function recordChangeRequest({
  prisma,
  weekStart: requestedWeekStart,
  customerName,
  requestedChange,
  source = 'operator',
  sourceReference = null,
} = {}) {
  const text = String(requestedChange || '').trim();
  if (!text) throw new Error('requestedChange is required');
  const { weekStart, cycle } = await loadCanonicalWeek(prisma, requestedWeekStart);
  if (!cycle) throw new Error(`No canonical meal-prep cycle exists for ${weekStart}; apply sync first.`);
  const menus = cycle.customerMenus.filter((menu) => normalizeName(menu.customerName) === normalizeName(customerName));
  if (menus.length !== 1) throw new Error(`Expected one exact customer menu for "${customerName}"; found ${menus.length}.`);
  const menu = menus[0];
  const requestKey = sha256({ text, source, sourceReference: sourceReference || null }).slice(0, 32);
  return prisma.mealPrepChangeRequest.upsert({
    where: { customerMenuId_requestKey: { customerMenuId: menu.id, requestKey } },
    update: {},
    create: {
      customerMenuId: menu.id,
      requestKey,
      status: 'open',
      requestedChange: text,
      source,
      sourceReference: sourceReference || null,
    },
  });
}

async function resolveChangeRequest({
  prisma,
  weekStart: requestedWeekStart,
  customerName,
  requestId,
  resolution,
} = {}) {
  const resolutionText = String(resolution || '').trim();
  if (!resolutionText) throw new Error('resolution is required');
  const { weekStart, cycle } = await loadCanonicalWeek(prisma, requestedWeekStart);
  if (!cycle) throw new Error(`No canonical meal-prep cycle exists for ${weekStart}; apply sync first.`);
  const menus = cycle.customerMenus.filter((menu) => normalizeName(menu.customerName) === normalizeName(customerName));
  if (menus.length !== 1) throw new Error(`Expected one exact customer menu for "${customerName}"; found ${menus.length}.`);
  const requests = menus[0].changeRequests.filter((request) =>
    request.id === requestId || request.requestKey === requestId);
  if (requests.length !== 1) throw new Error(`Expected one exact change request for "${requestId}"; found ${requests.length}.`);
  if (requests[0].status === 'resolved' && requests[0].resolution === resolutionText) return requests[0];
  return prisma.mealPrepChangeRequest.update({
    where: { id: requests[0].id },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      resolution: resolutionText,
    },
  });
}

module.exports = {
  NOTE_SOURCE,
  NOTE_TIMEZONE,
  addDaysIso,
  assignCustomerDish,
  unassignCustomerDish,
  buildOperatorSheet,
  deriveRequirements,
  diffPlannerCards,
  isMealPrepCard,
  loadCanonicalWeek,
  loadWeekEvidence,
  menuSourceId,
  normalizeName,
  projectPlannerCard,
  recordChangeRequest,
  resolveChangeRequest,
  resolveWeekStart,
  syncMealPrepWeek,
  _internals: {
    batchSourceHash,
    buildBlockers,
    customerMenuStatus,
    customerNameForCard,
    identityForCustomer,
    normalizeMeal,
    proposedCustomerMenus,
    proposedCycle,
    sha256,
    stableMenuItems,
    stableStringify,
  },
};
