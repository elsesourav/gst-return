import { Badge, Card, EmptyState } from "@/components/ui";
import type { GSTRProcessingResult } from "@/features/flipkart/gstr-parser";
import {
  compareReports,
  type ComparisonResult,
} from "@/features/flipkart/report-comparator";
import type { SalesReportResult } from "@/features/flipkart/sales-parser";
import { cn, formatCurrency } from "@/utils";
import { AlertTriangle, CheckCircle2, GitCompare } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ReportComparisonViewProps {
  salesResult: SalesReportResult | null;
  gstrResult: GSTRProcessingResult | null;
}

export function ReportComparisonView({
  salesResult,
  gstrResult,
}: ReportComparisonViewProps) {
  const comparison = useMemo(
    () => compareReports(salesResult, gstrResult),
    [salesResult, gstrResult],
  );

  if (!salesResult && !gstrResult) {
    return (
      <EmptyState
        icon={<GitCompare className="w-12 h-12" />}
        title="No Data to Compare"
        description="Upload and process both Sales Report and GSTR Return Report to see comparison"
      />
    );
  }

  if (!salesResult || !gstrResult) {
    return (
      <EmptyState
        icon={<GitCompare className="w-12 h-12" />}
        title="Need Both Reports"
        description={`Missing: ${!salesResult ? "Sales Report" : "GSTR Return Report"}. Upload both to compare.`}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <SummaryCards comparison={comparison} />

      {/* Comparison Table */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2 mb-4">
          <GitCompare className="w-4 h-4 text-brand-600" />
          State-wise Comparison Table
        </h3>
        <ComparisonTable comparison={comparison} />
      </Card>
    </div>
  );
}

// ============================================
// Summary Cards
// ============================================

function SummaryCards({ comparison }: { comparison: ComparisonResult }) {
  const cards = [
    {
      label: "Total States",
      value: comparison.rows.length,
      sub: `${comparison.matchedStates} matched`,
      color: "text-brand-600 bg-brand-50",
    },
    {
      label: "Mismatched",
      value: comparison.mismatchedStates,
      sub: comparison.mismatchedStates > 0 ? "Need attention" : "All good!",
      color:
        comparison.mismatchedStates > 0
          ? "text-danger-600 bg-danger-50"
          : "text-accent-600 bg-accent-50",
    },
    {
      label: "Taxable Diff",
      value: formatCurrency(Math.abs(comparison.totalTaxableDifference)),
      sub:
        comparison.totalTaxableDifference >= 0
          ? "Sales > Return"
          : "Return > Sales",
      color:
        Math.abs(comparison.totalTaxableDifference) > 1
          ? "text-warning-600 bg-warning-50"
          : "text-accent-600 bg-accent-50",
    },
    {
      label: "GST Diff",
      value: formatCurrency(Math.abs(comparison.totalGSTDifference)),
      sub:
        comparison.totalGSTDifference >= 0
          ? "Sales > Return"
          : "Return > Sales",
      color:
        Math.abs(comparison.totalGSTDifference) > 1
          ? "text-warning-600 bg-warning-50"
          : "text-accent-600 bg-accent-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className="p-4">
          <p className="text-xs text-surface-500 mb-1">{c.label}</p>
          <p className={cn("text-lg font-bold", c.color.split(" ")[0])}>
            {c.value}
          </p>
          <p className="text-[10px] text-surface-400 mt-0.5">{c.sub}</p>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Comparison Table
// ============================================

function ComparisonTable({ comparison }: { comparison: ComparisonResult }) {
  const fmt = (v: number) =>
    v.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const diffClass = (v: number) =>
    Math.abs(v) < 0.01
      ? "text-surface-400"
      : v > 0
        ? "text-warning-600 font-medium"
        : "text-danger-600 font-medium";

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-xs min-w-[900px]">
        <thead>
          <tr className="border-b border-surface-200">
            <th className="text-left py-2 px-3 font-semibold text-surface-900 sticky left-0 bg-surface-0 z-10">
              State
            </th>
            {/* Sales Report */}
            <th
              colSpan={2}
              className="text-center py-1 px-2 font-semibold text-accent-700 bg-accent-50/50 border-l border-surface-200"
            >
              Sales Report
            </th>
            {/* GSTR Return */}
            <th
              colSpan={2}
              className="text-center py-1 px-2 font-semibold text-brand-700 bg-brand-50/50 border-l border-surface-200"
            >
              GSTR Return
            </th>
            {/* Difference */}
            <th
              colSpan={2}
              className="text-center py-1 px-2 font-semibold text-warning-700 bg-warning-50/50 border-l border-surface-200"
            >
              Difference
            </th>
            <th className="w-6 border-l border-surface-200"></th>
          </tr>
          <tr className="border-b border-surface-200 text-[10px] text-surface-500 uppercase tracking-wider">
            <th className="text-left py-1.5 px-3 sticky left-0 bg-surface-0 z-10"></th>
            {/* Sales */}
            <th className="text-right py-1.5 px-2 border-l border-surface-200">
              Taxable
            </th>
            <th className="text-right py-1.5 px-2">GST Amt</th>
            {/* Return */}
            <th className="text-right py-1.5 px-2 border-l border-surface-200">
              Taxable
            </th>
            <th className="text-right py-1.5 px-2">GST Amt</th>
            {/* Diff */}
            <th className="text-right py-1.5 px-2 border-l border-surface-200">
              Taxable
            </th>
            <th className="text-right py-1.5 px-2">GST Amt</th>
            <th className="border-l border-surface-200"></th>
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row, i) => (
            <tr
              key={row.state}
              className={cn(
                "border-b border-surface-100 hover:bg-surface-50 transition-colors",
                i % 2 === 0 ? "bg-surface-0" : "bg-surface-50/30",
                row.hasMismatch && "bg-warning-50/20",
              )}
            >
              <td className="py-2 px-3 font-medium text-surface-900 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                {row.state}
                {!row.hasSalesData && (
                  <Badge variant="warning" className="ml-1 text-[8px] px-1">
                    No Sales
                  </Badge>
                )}
                {!row.hasReturnData && (
                  <Badge variant="info" className="ml-1 text-[8px] px-1">
                    No Return
                  </Badge>
                )}
              </td>
              {/* Sales */}
              <td className="text-right py-2 px-2 text-accent-700 border-l border-surface-200">
                {fmt(row.salesTaxableValue)}
              </td>
              <td className="text-right py-2 px-2 text-accent-700">
                {fmt(row.salesGSTAmount)}
              </td>
              {/* Return */}
              <td className="text-right py-2 px-2 text-brand-700 border-l border-surface-200">
                {fmt(row.returnTaxableValue)}
              </td>
              <td className="text-right py-2 px-2 text-brand-700">
                {fmt(row.returnGSTAmount)}
              </td>
              {/* Diff */}
              <td
                className={cn(
                  "text-right py-2 px-2 border-l border-surface-200",
                  diffClass(row.taxableDifference),
                )}
              >
                {fmt(row.taxableDifference)}
              </td>
              <td
                className={cn(
                  "text-right py-2 px-2",
                  diffClass(row.gstAmountDifference),
                )}
              >
                {fmt(row.gstAmountDifference)}
              </td>
              {/* Status icon */}
              <td className="text-center py-2 px-1 border-l border-surface-200">
                {row.hasMismatch ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-warning-500 mx-auto" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-500 mx-auto" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 border-surface-300 font-semibold text-surface-900 bg-surface-100">
            <td className="py-2.5 px-3 sticky left-0 bg-surface-100 z-10">
              TOTAL
            </td>
            <td className="text-right py-2.5 px-2 text-accent-700 border-l border-surface-200">
              {fmt(comparison.totalSalesTaxable)}
            </td>
            <td className="text-right py-2.5 px-2 text-accent-700">
              {fmt(comparison.totalSalesGST)}
            </td>
            <td className="text-right py-2.5 px-2 text-brand-700 border-l border-surface-200">
              {fmt(comparison.totalReturnTaxable)}
            </td>
            <td className="text-right py-2.5 px-2 text-brand-700">
              {fmt(comparison.totalReturnGST)}
            </td>
            <td
              className={cn(
                "text-right py-2.5 px-2 border-l border-surface-200",
                diffClass(comparison.totalTaxableDifference),
              )}
            >
              {fmt(comparison.totalTaxableDifference)}
            </td>
            <td
              className={cn(
                "text-right py-2.5 px-2",
                diffClass(comparison.totalGSTDifference),
              )}
            >
              {fmt(comparison.totalGSTDifference)}
            </td>
            <td className="border-l border-surface-200"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// Analytics Charts — exported for use in Analytics tab
// ============================================

// Rate breakdown pie chart colors
const RATE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

interface SalesAnalyticsProps {
  salesResult: SalesReportResult | null;
  gstrResult: GSTRProcessingResult | null;
}

export function SalesAnalyticsCharts({
  salesResult,
  gstrResult,
}: SalesAnalyticsProps) {
  const comparison = useMemo(
    () => compareReports(salesResult, gstrResult),
    [salesResult, gstrResult],
  );

  // Rate breakdown from gstrData (state+rate buckets)
  const rateBreakdown = useMemo(() => {
    if (!salesResult?.gstrData) return [];
    const rateMap = new Map<number, number>();
    for (const entry of salesResult.gstrData) {
      rateMap.set(
        entry.gstRate,
        (rateMap.get(entry.gstRate) || 0) + entry.taxableValue,
      );
    }
    return Array.from(rateMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rate, taxable]) => ({
        rate: `${rate}%`,
        taxable: +taxable.toFixed(2),
      }));
  }, [salesResult]);

  // State-wise bar chart (Sales vs Return)
  const chartData = comparison.rows.map((row) => ({
    state: row.state.length > 12 ? row.state.substring(0, 12) + "…" : row.state,
    fullState: row.state,
    salesTaxable: row.salesTaxableValue,
    returnTaxable: row.returnTaxableValue,
  }));

  return (
    <div className="space-y-6">
      {/* Rate Breakdown */}
      {rateBreakdown.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-4">
            📊 Sales — GST Rate Breakdown
          </h3>
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Pie chart */}
            <div className="h-[220px] w-full lg:w-[260px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rateBreakdown}
                    dataKey="taxable"
                    nameKey="rate"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {rateBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={RATE_COLORS[i % RATE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Rate table */}
            <div className="flex-1 w-full">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-200 text-[10px] uppercase tracking-wider text-surface-500">
                    <th className="text-left py-1.5 px-2">Rate</th>
                    <th className="text-right py-1.5 px-2">Taxable Value</th>
                    <th className="text-right py-1.5 px-2">% Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rateBreakdown.map((r, i) => {
                    const total = rateBreakdown.reduce(
                      (s, x) => s + x.taxable,
                      0,
                    );
                    return (
                      <tr key={r.rate} className="border-b border-surface-100">
                        <td className="py-2 px-2 font-medium">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5"
                            style={{
                              background: RATE_COLORS[i % RATE_COLORS.length],
                            }}
                          />
                          {r.rate} GST
                        </td>
                        <td className="text-right py-2 px-2 text-accent-700 font-mono">
                          {formatCurrency(r.taxable)}
                        </td>
                        <td className="text-right py-2 px-2 text-surface-500">
                          {total > 0
                            ? ((r.taxable / total) * 100).toFixed(1)
                            : "0"}
                          %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-200 font-semibold">
                    <td className="py-2 px-2">Total</td>
                    <td className="text-right py-2 px-2 text-accent-700 font-mono">
                      {formatCurrency(
                        rateBreakdown.reduce((s, x) => s + x.taxable, 0),
                      )}
                    </td>
                    <td className="text-right py-2 px-2">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* State-wise bar chart */}
      {chartData.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-4">
            📈 State-wise Taxable Value: Sales vs GSTR Return
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-surface-200, #e5e7eb)"
                />
                <XAxis
                  dataKey="state"
                  tick={{
                    fontSize: 10,
                    fill: "var(--color-surface-500, #6b7280)",
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "var(--color-surface-500, #6b7280)",
                  }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-surface-0 border border-surface-200 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold text-surface-900 mb-1">
                          {d?.fullState}
                        </p>
                        <p className="text-accent-600">
                          Sales: {formatCurrency(d?.salesTaxable || 0)}
                        </p>
                        {d?.returnTaxable !== undefined && (
                          <p className="text-brand-600">
                            Return: {formatCurrency(d?.returnTaxable || 0)}
                          </p>
                        )}
                        {d?.returnTaxable !== undefined && (
                          <p
                            className={cn(
                              "mt-1 font-medium",
                              d?.salesTaxable - d?.returnTaxable > 0
                                ? "text-warning-600"
                                : "text-accent-600",
                            )}
                          >
                            Diff:{" "}
                            {formatCurrency(
                              Math.abs(
                                (d?.salesTaxable || 0) -
                                  (d?.returnTaxable || 0),
                              ),
                            )}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar
                  dataKey="salesTaxable"
                  name="Sales Report"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
                {gstrResult && (
                  <Bar
                    dataKey="returnTaxable"
                    name="GSTR Return"
                    fill="#6366f1"
                    radius={[3, 3, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
