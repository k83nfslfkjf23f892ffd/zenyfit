// Widget definitions and configuration for customizable dashboard

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
}

// All available widgets
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    id: 'user-header',
    name: 'User Header',
    description: 'Username, level, XP, and progress bar',
  },
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
    id: 'weekly-activity',
    name: 'Weekly Activity',
    description: 'Bar chart of workouts per day',
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
    id: 'xp-history',
    name: 'XP History',
    description: 'XP progress over time',
  },
  {
    id: 'active-challenges',
    name: 'Active Challenges',
    description: 'Current challenge progress',
  },
];

// Default widget configuration for new users
export const DEFAULT_WIDGET_CONFIG = {
  order: [
    'user-header',
    'stats-grid',
    'exercise-ratio',
    'weekly-activity',
    'consistency',
    'personal-bests',
    'exercise-totals',
    'xp-history',
    'active-challenges',
  ],
  // Widgets that are hidden by default
  hidden: [
    'consistency',
    'personal-bests',
    'exercise-totals',
    'xp-history',
    'active-challenges',
  ],
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
  return effectiveConfig.order.filter((id) => !effectiveConfig.hidden.includes(id));
}
