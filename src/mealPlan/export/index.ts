import type { EffectiveDay, MealType } from '../types';
import {
  createEmptyNutrients,
  NUTRIENT_KEYS,
  type Nutrients,
} from '../../nutrition/nutrients';
import { scaleNutrients, sumMeal } from '../../nutrition/calc';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export type DailyNutritionEntry = {
  day: number;
  dinnerType: string;
  dinnerName: string;
} & Nutrients;

export const NUTRITION_CSV_FIELDS = [
  { key: 'day', label: 'Day' },
  { key: 'dinnerType', label: 'Dinner Code' },
  { key: 'dinnerName', label: 'Dinner Name' },
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'ala', label: 'ALA (g)' },
  { key: 'epa_dha', label: 'EPA + DHA (g)' },
  { key: 'vitA', label: 'Vitamin A (mcg)' },
  { key: 'b12', label: 'Vitamin B12 (mcg)' },
  { key: 'folate', label: 'Folate (mcg)' },
  { key: 'vitC', label: 'Vitamin C (mg)' },
  { key: 'vitD', label: 'Vitamin D (mcg)' },
  { key: 'vitK', label: 'Vitamin K (mcg)' },
  { key: 'calcium', label: 'Calcium (mg)' },
  { key: 'magnesium', label: 'Magnesium (mg)' },
  { key: 'potassium', label: 'Potassium (mg)' },
  { key: 'zinc', label: 'Zinc (mg)' },
  { key: 'iron', label: 'Iron (mg)' },
] as const;

export const MEAL_DETAIL_FIELDS = [
  { key: 'day', label: 'Day' },
  { key: 'dinnerType', label: 'Dinner Code' },
  { key: 'mealType', label: 'Meal Type' },
  { key: 'mealName', label: 'Meal Name' },
  { key: 'ingredientName', label: 'Ingredient' },
  { key: 'amount', label: 'Amount' },
  { key: 'unit', label: 'Unit' },
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'ala', label: 'ALA (g)' },
  { key: 'epa_dha', label: 'EPA + DHA (g)' },
  { key: 'vitA', label: 'Vitamin A (mcg)' },
  { key: 'b12', label: 'Vitamin B12 (mcg)' },
  { key: 'folate', label: 'Folate (mcg)' },
  { key: 'vitC', label: 'Vitamin C (mg)' },
  { key: 'vitD', label: 'Vitamin D (mcg)' },
  { key: 'vitK', label: 'Vitamin K (mcg)' },
  { key: 'calcium', label: 'Calcium (mg)' },
  { key: 'magnesium', label: 'Magnesium (mg)' },
  { key: 'potassium', label: 'Potassium (mg)' },
  { key: 'zinc', label: 'Zinc (mg)' },
  { key: 'iron', label: 'Iron (mg)' },
] as const;

export const buildDailyNutrition = (
  effectiveDays: EffectiveDay[]
): DailyNutritionEntry[] =>
  effectiveDays.map(({ plan, meals }) => {
    const totals = createEmptyNutrients();
    mealTypes.forEach((type) => {
      const mealTotals = sumMeal(meals[type].meal);
      NUTRIENT_KEYS.forEach((key) => {
        totals[key] += mealTotals[key] || 0;
      });
    });

    return {
      day: plan.day,
      dinnerType: plan.dinnerType,
      dinnerName: meals.dinner.meal.name,
      ...totals,
    };
  });

export const buildNutritionCsv = (rows: DailyNutritionEntry[]) => {
  const allRows = [
    NUTRITION_CSV_FIELDS.map((field) => field.label),
    ...rows.map((entry) =>
      NUTRITION_CSV_FIELDS.map((field) => entry[field.key as keyof typeof entry] ?? '')
    ),
  ];

  return allRows
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          return /[",\n]/.test(str) ? `"${str.replace(/\"/g, '\"\"')}"` : str;
        })
        .join(',')
    )
    .join('\r\n');
};

const escapeXml = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
};

export const buildExcelXml = (
  dailyEntries: DailyNutritionEntry[],
  effectiveDays: EffectiveDay[]
) => {
  const summaryHeader = `<Row>${NUTRITION_CSV_FIELDS.map(
    (field) => `<Cell><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
  ).join('')}</Row>`;

  const summaryRows = dailyEntries
    .map((entry) =>
      `<Row>${NUTRITION_CSV_FIELDS.map((field) => {
        const value = entry[field.key as keyof typeof entry] ?? '';
        const isNumber = typeof value === 'number' && !Number.isNaN(value);
        const type = isNumber ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
      }).join('')}</Row>`
    )
    .join('');

  const detailRows = [];

  effectiveDays.forEach(({ plan, meals }) => {
    mealTypes.forEach((mealType) => {
      const instance = meals[mealType];
      (instance.meal.ingredients || []).forEach((ingredient) => {
        const nutrients = scaleNutrients(
          ingredient.nutrientsPer100g,
          ingredient.amount
        );
        detailRows.push(
          MEAL_DETAIL_FIELDS.map((field) => {
            switch (field.key) {
              case 'day':
                return plan.day;
              case 'dinnerType':
                return plan.dinnerType;
              case 'mealType':
                return mealType;
              case 'mealName':
                return instance.meal.name;
              case 'ingredientName':
                return ingredient.name;
              case 'amount':
                return ingredient.displayAmount ?? ingredient.amount;
              case 'unit':
                return ingredient.displayUnit || ingredient.unit;
              default:
                return nutrients[field.key as keyof Nutrients] ?? '';
            }
          })
        );
      });
    });
  });

  const detailHeader = `<Row>${MEAL_DETAIL_FIELDS.map(
    (field) => `<Cell><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
  ).join('')}</Row>`;

  const detailBody = detailRows
    .map(
      (row) =>
        `<Row>${row
          .map((value) => {
            const isNumber = typeof value === 'number' && !Number.isNaN(value);
            const type = isNumber ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');

  return `<?xml version=\"1.0\"?>\n<?mso-application progid=\"Excel.Sheet\"?>\n<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n  <Worksheet ss:Name=\"Daily Summary\">\n    <Table>\n      ${summaryHeader}${summaryRows}\n    </Table>\n  </Worksheet>\n  <Worksheet ss:Name=\"Meals & Ingredients\">\n    <Table>\n      ${detailHeader}${detailBody}\n    </Table>\n  </Worksheet>\n</Workbook>`;
};
