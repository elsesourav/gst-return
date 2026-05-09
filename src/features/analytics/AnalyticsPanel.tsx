import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { cn, formatCurrency, formatNumber } from '@/utils';
import { Card } from '@/components/ui';
import { TrendingUp, BarChart3, MapPin, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import type { StandardizedRecord, AnalyticsFilter, ProcessingSummary } from '@/types';

// Chart color palette
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
  '#22c55e', '#16a34a', '#f59e0b', '#ef4444',
  '#06b6d4', '#0ea5e9', '#ec4899', '#f97316',
  '#14b8a6', '#84cc16', '#eab308', '#d946ef',
];

interface AnalyticsPanelProps {
  records: StandardizedRecord[];
  summary: ProcessingSummary | null;
}

export function AnalyticsPanel({ records, summary }: AnalyticsPanelProps) {
  const [filter, setFilter] = useState<AnalyticsFilter>('monthly');

  // ============================================
  // Sales Trend Data
  // ============================================
  const salesTrendData = useMemo(() => {
    if (!records.length) return [];

    const grouped = new Map<string, { label: string; sales: number; gst: number; count: number }>();

    records.forEach((r) => {
      const d = dayjs(r.date);
      let key: string;
      let label: string;

      switch (filter) {
        case 'monthly':
          key = d.format('YYYY-MM');
          label = d.format('MMM YY');
          break;
        case 'quarterly': {
          const quarter = Math.floor(d.month() / 3) + 1;
          key = `${d.year()}-Q${quarter}`;
          label = `Q${quarter} ${d.format('YY')}`;
          break;
        }
        case 'yearly':
          key = d.format('YYYY');
          label = d.format('YYYY');
          break;
      }

      const existing = grouped.get(key) || { label, sales: 0, gst: 0, count: 0 };
      existing.sales += r.totalAmount;
      existing.gst += r.gstAmount;
      existing.count += 1;
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        ...value,
        sales: Math.round(value.sales * 100) / 100,
        gst: Math.round(value.gst * 100) / 100,
      }));
  }, [records, filter]);

  // ============================================
  // State-wise Data
  // ============================================
  const stateWiseData = useMemo(() => {
    if (!summary) return [];
    return summary.stateWise
      .filter((s) => s.totalAmount > 0)
      .slice(0, 15)
      .map((s) => ({
        name: s.state.length > 15 ? s.state.substring(0, 13) + '...' : s.state,
        fullName: s.state,
        sales: Math.round(s.totalAmount * 100) / 100,
        gst: Math.round(s.totalGST * 100) / 100,
        records: s.recordCount,
      }));
  }, [summary]);

  // ============================================
  // GST Breakdown (Pie Chart)
  // ============================================
  const gstBreakdown = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'CGST', value: Math.round(summary.totalCGST * 100) / 100, color: '#6366f1' },
      { name: 'SGST', value: Math.round(summary.totalSGST * 100) / 100, color: '#22c55e' },
      { name: 'IGST', value: Math.round(summary.totalIGST * 100) / 100, color: '#f59e0b' },
    ].filter((d) => d.value > 0);
  }, [summary]);

  if (!records.length) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="w-10 h-10 text-surface-300 mx-auto mb-3" />
        <h3 className="font-semibold text-surface-700 mb-1">Analytics</h3>
        <p className="text-sm text-surface-500">
          Process some data to see analytics and visualizations
        </p>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-surface-0 border border-surface-200 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold text-surface-900 mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-surface-600">{p.name}:</span>
            <span className="font-semibold">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          Analytics & Insights
        </h3>

        {/* Filter Tabs */}
        <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
          {(['monthly', 'quarterly', 'yearly'] as AnalyticsFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                filter === f
                  ? 'bg-surface-0 text-brand-600 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Sales', value: formatCurrency(summary.totalAmount), icon: <TrendingUp className="w-4 h-4" />, color: 'text-brand-600 bg-brand-50' },
            { label: 'Taxable Amount', value: formatCurrency(summary.totalTaxableAmount), icon: <Calendar className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
            { label: 'Total GST', value: formatCurrency(summary.totalGST), icon: <BarChart3 className="w-4 h-4" />, color: 'text-accent-600 bg-accent-50' },
            { label: 'States Covered', value: summary.stateWise.length.toString(), icon: <MapPin className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50' },
          ].map((stat, i) => (
            <div key={i} className="p-3 rounded-xl bg-surface-0 border border-surface-200">
              <div className={cn('inline-flex p-1.5 rounded-lg mb-2', stat.color)}>{stat.icon}</div>
              <p className="text-lg font-bold text-surface-900">{stat.value}</p>
              <p className="text-xs text-surface-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-surface-900 mb-4">📈 Sales Trend</h4>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesTrendData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-surface-400)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-surface-400)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#salesGradient)" strokeWidth={2} name="Total Sales" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* GST Collected */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-surface-900 mb-4">💰 GST Collected</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-surface-400)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-surface-400)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gst" fill="#22c55e" radius={[4, 4, 0, 0]} name="GST Amount" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* State-wise Sales */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-surface-900 mb-4">🗺️ State-wise Sales</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stateWiseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--color-surface-400)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-surface-400)" width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" name="Sales">
                {stateWiseData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* GST Breakdown Pie */}
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-surface-900 mb-4">🍩 GST Breakdown</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={gstBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {gstBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-surface-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
