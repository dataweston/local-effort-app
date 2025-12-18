export const NUTRIENT_KEYS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'ala',
  'epa',
  'dha',
  'epa_dha',
  'vitA',
  'b12',
  'folate',
  'vitC',
  'vitD',
  'vitK',
  'calcium',
  'magnesium',
  'potassium',
  'zinc',
  'iron',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export type Nutrients = Record<NutrientKey, number>;

export const NUTRIENT_META: Record<
  NutrientKey,
  { label: string; unit: string }
> = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein: { label: 'Protein', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  ala: { label: 'ALA', unit: 'g' },
  epa: { label: 'EPA', unit: 'g' },
  dha: { label: 'DHA', unit: 'g' },
  epa_dha: { label: 'EPA + DHA', unit: 'g' },
  vitA: { label: 'Vitamin A', unit: 'mcg' },
  b12: { label: 'Vitamin B12', unit: 'mcg' },
  folate: { label: 'Folate', unit: 'mcg' },
  vitC: { label: 'Vitamin C', unit: 'mg' },
  vitD: { label: 'Vitamin D', unit: 'mcg' },
  vitK: { label: 'Vitamin K', unit: 'mcg' },
  calcium: { label: 'Calcium', unit: 'mg' },
  magnesium: { label: 'Magnesium', unit: 'mg' },
  potassium: { label: 'Potassium', unit: 'mg' },
  zinc: { label: 'Zinc', unit: 'mg' },
  iron: { label: 'Iron', unit: 'mg' },
};

export const createEmptyNutrients = (): Nutrients =>
  NUTRIENT_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Nutrients);

export const sumNutrients = (values: Nutrients[]): Nutrients => {
  const total = createEmptyNutrients();
  values.forEach((nutrients) => {
    NUTRIENT_KEYS.forEach((key) => {
      total[key] += nutrients[key] || 0;
    });
  });
  return total;
};
