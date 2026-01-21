'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Color palette for chart lines
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
];

const CATEGORY_COLORS: Record<string, string> = {
  calisthenics: 'hsl(var(--primary))',
  cardio: 'hsl(var(--chart-2))',
  team_sports: 'hsl(var(--chart-3))',
};

interface XPTrendData {
  date: string;
  [username: string]: string | number;
}

interface DistributionData {
  name: string;
  type: string;
  count: number;
  xp: number;
  category: string;
}

interface HeatmapData {
  date: string;
  count: number;
  xp: number;
}

interface RankingData {
  rank: number;
  username: string;
  xp: number;
  level: number;
  weeklyXp: number;
}

interface CategoryTotals {
  calisthenics: number;
  cardio: number;
  team_sports: number;
}

interface LeaderboardChartsProps {
  xpTrends: XPTrendData[];
  distribution: DistributionData[];
  heatmap: HeatmapData[];
  rankings: RankingData[];
  categoryTotals: CategoryTotals;
  topUsers: { id: string; username: string }[];
}

// XP Trends Line Chart
function XPTrendsChart({ data, topUsers }: { data: XPTrendData[]; topUsers: { id: string; username: string }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
          }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
        {topUsers.slice(0, 5).map((user, index) => (
          <Line
            key={user.id}
            type="monotone"
            dataKey={user.username}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Exercise Distribution Bar Chart
function DistributionChart({ data }: { data: DistributionData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No distribution data available
      </div>
    );
  }

  const top10 = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={top10} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
        />
        <YAxis
          type="category"
          dataKey="name"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name === 'xp' ? 'XP' : 'Workouts']}
        />
        <Bar
          dataKey="xp"
          radius={[0, 4, 4, 0]}
          name="XP"
        >
          {top10.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Category Pie Chart
function CategoryPieChart({ data }: { data: CategoryTotals }) {
  const pieData = [
    { name: 'Calisthenics', value: data.calisthenics, color: CATEGORY_COLORS.calisthenics },
    { name: 'Cardio', value: data.cardio, color: CATEGORY_COLORS.cardio },
    { name: 'Team Sports', value: data.team_sports, color: CATEGORY_COLORS.team_sports },
  ].filter(d => d.value > 0);

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No category data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [value.toLocaleString() + ' XP', 'Total']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Activity Heatmap
function ActivityHeatmap({ data }: { data: HeatmapData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No activity data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Group by week (7 days per row)
  const weeks: HeatmapData[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap justify-center">
        {data.map((day, index) => {
          const intensity = day.count / maxCount;
          const opacity = day.count === 0 ? 0.1 : 0.2 + intensity * 0.8;

          return (
            <div
              key={index}
              className="w-4 h-4 rounded-sm cursor-default"
              style={{
                backgroundColor: `hsl(var(--primary) / ${opacity})`,
              }}
              title={`${day.date}: ${day.count} workouts, ${day.xp} XP`}
            />
          );
        })}
      </div>
      <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 1].map((opacity) => (
            <div
              key={opacity}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Weekly Rankings with XP change
function WeeklyRankings({ data }: { data: RankingData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No ranking data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((user) => (
        <div
          key={user.username}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg w-6 text-center text-muted-foreground">
              {user.rank}
            </span>
            <div>
              <div className="font-medium text-sm">{user.username}</div>
              <div className="text-xs text-muted-foreground">Level {user.level}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-primary">{user.xp.toLocaleString()} XP</div>
            {user.weeklyXp > 0 && (
              <div className="text-xs text-green-500">+{user.weeklyXp.toLocaleString()} this week</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main component
export function LeaderboardCharts({
  xpTrends,
  distribution,
  heatmap,
  rankings,
  categoryTotals,
  topUsers,
}: LeaderboardChartsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Overview</CardTitle>
        <CardDescription>Community activity and progress</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
            <TabsTrigger value="exercises" className="text-xs">Exercises</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="rankings" className="text-xs">Rankings</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-0">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Weekly XP Progress</h4>
              <p className="text-xs text-muted-foreground mb-2">Top 5 users XP earned each day</p>
              <XPTrendsChart data={xpTrends} topUsers={topUsers} />
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-2">By Category</h4>
                <CategoryPieChart data={categoryTotals} />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Top Exercises</h4>
                <DistributionChart data={distribution} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">30-Day Activity</h4>
              <p className="text-xs text-muted-foreground mb-4">Community workout frequency</p>
              <ActivityHeatmap data={heatmap} />
            </div>
          </TabsContent>

          <TabsContent value="rankings" className="mt-0">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Top 10 Users</h4>
              <p className="text-xs text-muted-foreground mb-2">Weekly XP gains</p>
              <WeeklyRankings data={rankings} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
