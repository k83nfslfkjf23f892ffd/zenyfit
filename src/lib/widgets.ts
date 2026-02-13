// Widget definitions and configuration for customizable dashboard

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
}

// All available widgets
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    id: 'stats-grid',
    name: 'Stats Grid',
    description: 'Workouts, this week, XP, achievements',
  },
  {
    id: 'exercise-ratio',
    name: 'Exercise Chart',
    description: 'Calisthenics distribution pie chart',
  },
  {
    id: 'streaks',
    name: 'Workout Streak',
    description: 'Current and best workout streaks',
  },
  {
    id: 'consistency',
    name: 'Consistency Score',
    description: 'Workout streak and consistency %',
  },
  {
    id: 'personal-bests',
    name: 'Personal Bests',
    description: 'Your highest workout records',
  },
  {
    id: 'exercise-totals',
    name: 'Exercise Totals',
    description: 'Lifetime totals per exercise',
  },
  {
    id: 'active-challenges',
    name: 'Active Challenges',
    description: 'Current challenge progress',
  },
];

// Default widget configuration for new users - all visible
export const DEFAULT_WIDGET_CONFIG = {
  order: [
    'stats-grid',
    'streaks',
    'exercise-ratio',
    'consistency',
    'personal-bests',
    'exercise-totals',
    'active-challenges',
  ],
  hidden: [], // All widgets visible by default
};

// Get widget definition by ID
export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS.find((w) => w.id === id);
}

// Get visible widgets in order
export function getVisibleWidgets(
  config: { order: string[]; hidden: string[] } | undefined
): string[] {
  const effectiveConfig = config || DEFAULT_WIDGET_CONFIG;
  const validIds = WIDGET_DEFINITIONS.map((w) => w.id);
  return effectiveConfig.order.filter((id) => validIds.includes(id) && !effectiveConfig.hidden.includes(id));
}

// Get hidden widgets in order
export function getHiddenWidgets(
  config: { order: string[]; hidden: string[] } | undefined
): string[] {
  const effectiveConfig = config || DEFAULT_WIDGET_CONFIG;
  const validIds = WIDGET_DEFINITIONS.map((w) => w.id);
  return effectiveConfig.order.filter((id) => validIds.includes(id) && effectiveConfig.hidden.includes(id));
}
