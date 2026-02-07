// Default weekly schedule data for the kanban planner.
// Cards are now date-based. WEEKLY_TEMPLATE defines the recurring pattern,
// and generateCardsForRange() stamps it onto real calendar dates.

import { getWeekStart, addWeeks, generateWeekCards, getToday } from './dateUtils';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const PEOPLE = ['Weston', 'Catherine', 'Teddy'];

/**
 * The weekly template. Each entry has a `dayOfWeek` and `templateKey`.
 * `effectTargetTemplate` links to another template's `templateKey` (for effectTarget remapping).
 */
export const WEEKLY_TEMPLATE = [
  // ── Monday ──
  {
    templateKey: 'mon-cook',
    title: 'Cook',
    dayOfWeek: 'Monday',
    zone: 'timed',
    people: ['Weston', 'Catherine'],
    startTime: '07:00',
    endTime: '16:00',
    revenue: 450,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'mon-babysitter',
    title: 'Babysitter for Teddy',
    dayOfWeek: 'Monday',
    zone: 'timed',
    people: ['Teddy'],
    startTime: '08:00',
    endTime: '14:00',
    revenue: 0,
    cost: 0,
    costPerHour: 20,
    optional: true,
    enabled: false,
    effectType: null,
    effectTargetTemplate: null,
    order: 2,
  },

  // ── Tuesday ──
  {
    templateKey: 'tue-catherine-off',
    title: 'Catherine off with Teddy',
    dayOfWeek: 'Tuesday',
    zone: 'untimed',
    people: ['Catherine', 'Teddy'],
    startTime: null,
    endTime: null,
    revenue: 0,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'tue-admin',
    title: 'Admin',
    dayOfWeek: 'Tuesday',
    zone: 'timed',
    people: ['Weston'],
    startTime: '10:00',
    endTime: '18:00',
    revenue: 0,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },

  // ── Wednesday ──
  {
    templateKey: 'wed-cook',
    title: 'Cook',
    dayOfWeek: 'Wednesday',
    zone: 'timed',
    people: ['Weston', 'Catherine'],
    startTime: '07:00',
    endTime: '10:00',
    revenue: 200,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'wed-sub-cook',
    title: 'Substitute cook',
    dayOfWeek: 'Wednesday',
    zone: 'timed',
    people: [],
    startTime: '07:00',
    endTime: '10:00',
    revenue: 0,
    cost: 0,
    costPerHour: 35,
    optional: true,
    enabled: false,
    effectType: null,
    effectTargetTemplate: null,
    order: 2,
  },

  // ── Thursday ──
  {
    templateKey: 'thu-catherine-off',
    title: 'Catherine off with Teddy',
    dayOfWeek: 'Thursday',
    zone: 'untimed',
    people: ['Catherine', 'Teddy'],
    startTime: null,
    endTime: null,
    revenue: 0,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'thu-pizza',
    title: 'Pizza',
    dayOfWeek: 'Thursday',
    zone: 'timed',
    people: ['Weston'],
    startTime: '10:00',
    endTime: '14:00',
    revenue: 200,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'thu-second-cook',
    title: 'Second cook',
    dayOfWeek: 'Thursday',
    zone: 'timed',
    people: [],
    startTime: '10:00',
    endTime: '14:00',
    revenue: 0,
    cost: 0,
    costPerHour: 35,
    optional: true,
    enabled: false,
    effectType: 'double_revenue',
    effectTargetTemplate: 'thu-pizza',
    order: 2,
  },

  // ── Friday ──
  {
    templateKey: 'fri-cook',
    title: 'Cook',
    dayOfWeek: 'Friday',
    zone: 'timed',
    people: ['Weston', 'Catherine'],
    startTime: '06:00',
    endTime: '10:00',
    revenue: 200,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'fri-babysitter',
    title: 'Babysitter for Teddy',
    dayOfWeek: 'Friday',
    zone: 'timed',
    people: ['Teddy'],
    startTime: '06:00',
    endTime: '10:00',
    revenue: 0,
    cost: 0,
    costPerHour: 20,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 2,
  },
  {
    templateKey: 'fri-store',
    title: 'Co-op',
    dayOfWeek: 'Friday',
    zone: 'timed',
    people: ['Catherine'],
    startTime: '11:00',
    endTime: '16:00',
    revenue: 125,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 3,
  },
  {
    templateKey: 'fri-teddy-weston',
    title: 'Teddy with Weston',
    dayOfWeek: 'Friday',
    zone: 'untimed',
    people: ['Weston', 'Teddy'],
    startTime: null,
    endTime: null,
    revenue: 0,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },

  // ── Saturday ──
  // No scheduled work

  // ── Sunday ──
  {
    templateKey: 'sun-cook',
    title: 'Cook',
    dayOfWeek: 'Sunday',
    zone: 'timed',
    people: ['Weston'],
    startTime: '10:00',
    endTime: '18:00',
    revenue: 200,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 1,
  },
  {
    templateKey: 'sun-second-cook',
    title: 'Second cook',
    dayOfWeek: 'Sunday',
    zone: 'timed',
    people: [],
    startTime: '10:00',
    endTime: '18:00',
    revenue: 0,
    cost: 0,
    costPerHour: 35,
    optional: true,
    enabled: false,
    effectType: 'double_revenue',
    effectTargetTemplate: 'sun-cook',
    order: 2,
  },
  {
    templateKey: 'sun-store',
    title: 'Co-op',
    dayOfWeek: 'Sunday',
    zone: 'timed',
    people: ['Catherine'],
    startTime: '07:30',
    endTime: '15:00',
    revenue: 150,
    cost: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 3,
  },
  {
    templateKey: 'sun-babysitter',
    title: 'Babysitter for Teddy',
    dayOfWeek: 'Sunday',
    zone: 'timed',
    people: ['Teddy'],
    startTime: '09:00',
    endTime: '15:00',
    revenue: 0,
    cost: 0,
    costPerHour: 0,
    optional: false,
    enabled: true,
    effectType: null,
    effectTargetTemplate: null,
    order: 4,
  },
];

/**
 * Generate cards for a date range (inclusive of both endpoints' weeks).
 */
export function generateCardsForRange(startDate, endDate) {
  let weekStart = getWeekStart(startDate);
  const lastWeek = getWeekStart(endDate);
  const allCards = [];

  while (weekStart <= lastWeek) {
    allCards.push(...generateWeekCards(WEEKLY_TEMPLATE, weekStart));
    weekStart = addWeeks(weekStart, 1);
  }

  return allCards;
}

/**
 * Generate cards for the current week only (convenience for demo mode).
 */
export function generateCurrentWeekCards() {
  const today = getToday();
  const weekStart = getWeekStart(today);
  return generateWeekCards(WEEKLY_TEMPLATE, weekStart);
}

/**
 * Generate cards from today through end of year.
 */
export function generateRestOfYearCards() {
  const today = getToday();
  const year = parseInt(today.split('-')[0], 10);
  return generateCardsForRange(today, `${year}-12-31`);
}

// Backward compatibility
export function createDefaultCards() {
  return generateCurrentWeekCards();
}
