import { useState, useMemo } from 'react';
import { compareDatasets } from '@/features/flipkart/parser';
import { cn, formatCurrency, formatNumber } from '@/utils';
import { Button, Card, Badge } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { GitCompare, AlertTriangle, MinusCircle, PlusCircle, ArrowLeftRight } from 'lucide-react';
import type { StandardizedRecord, ProcessedData } from '@/types';

interface ComparisonEngineProps {
  processedDataList: ProcessedData[];
}

export function ComparisonEngine({ processedDataList }: ComparisonEngineProps) {
  const [oldDataId, setOldDataId] = useState('');
  const [newDataId, setNewDataId] = useState('');
  const [showResults, setShowResults] = useState(false);

  const oldData = processedDataList.find((p) => p.id === oldDataId);
  const newData = processedDataList.find((p) => p.id === newDataId);

  const comparison = useMemo(() => {
    if (!oldData || !newData) return null;
    return compareDatasets(oldData.records, newData.records);
  }, [oldData, newData]);

  const handleCompare = () => {
    if (!oldDataId || !newDataId) return;
    setShowResults(true);
  };

  if (processedDataList.length < 2) {
    return (
      <Card className="p-6 text-center">
        <GitCompare className="w-10 h-10 text-surface-300 mx-auto mb-3" />
        <h3 className="font-semibold text-surface-700 mb-1">Comparison Engine</h3>
        <p className="text-sm text-surface-500">
          You need at least 2 processed datasets to compare. Generate more reports first.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
        <GitCompare className="w-5 h-5 text-brand-600" />
        Comparison Engine
      </h3>

      {/* Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">
            Old / Base File
          </label>
          <select
            value={oldDataId}
            onChange={(e) => setOldDataId(e.target.value)}
            className="w-full rounded-lg border border-surface-300 bg-surface-0 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Select base file...</option>
            {processedDataList.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === newDataId}>
                {p.summary.totalRecords} records — {new Date(p.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">
            New / Compare File
          </label>
          <select
            value={newDataId}
            onChange={(e) => setNewDataId(e.target.value)}
            className="w-full rounded-lg border border-surface-300 bg-surface-0 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Select compare file...</option>
            {processedDataList.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === oldDataId}>
                {p.summary.totalRecords} records — {new Date(p.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        onClick={handleCompare}
        disabled={!oldDataId || !newDataId}
        icon={<ArrowLeftRight className="w-4 h-4" />}
      >
        Compare
      </Button>

      {/* Results Modal */}
      <Modal
        isOpen={showResults && !!comparison}
        onClose={() => setShowResults(false)}
        title="Comparison Results"
        size="xl"
      >
        {comparison && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard
                icon={<AlertTriangle className="w-5 h-5 text-warning-500" />}
                label="Total Mismatches"
                value={comparison.summary.totalMismatches}
                variant="warning"
              />
              <SummaryCard
                icon={<MinusCircle className="w-5 h-5 text-danger-500" />}
                label="Missing in New"
                value={comparison.summary.missingInNewCount}
                variant="danger"
              />
              <SummaryCard
                icon={<PlusCircle className="w-5 h-5 text-accent-500" />}
                label="Missing in Old"
                value={comparison.summary.missingInOldCount}
                variant="success"
              />
              <SummaryCard
                icon={<ArrowLeftRight className="w-5 h-5 text-brand-500" />}
                label="Difference Value"
                value={formatCurrency(comparison.summary.totalDifferenceValue)}
                variant="info"
              />
            </div>

            {/* Amount Mismatches */}
            {comparison.amountMismatches.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-900 mb-2">
                  Amount Mismatches ({comparison.amountMismatches.length})
                </h4>
                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-surface-600 border-b">Order ID</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-surface-600 border-b">Field</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-surface-600 border-b">Old Value</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-surface-600 border-b">New Value</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-surface-600 border-b">Difference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {comparison.amountMismatches.map((m, i) => (
                          <tr key={i} className="hover:bg-surface-50">
                            <td className="px-3 py-2 text-xs font-mono">{m.orderId}</td>
                            <td className="px-3 py-2 text-xs">{m.field}</td>
                            <td className="px-3 py-2 text-xs text-right font-mono">{formatCurrency(m.oldValue)}</td>
                            <td className="px-3 py-2 text-xs text-right font-mono">{formatCurrency(m.newValue)}</td>
                            <td className={cn(
                              'px-3 py-2 text-xs text-right font-mono font-semibold',
                              m.difference > 0 ? 'text-accent-600' : 'text-danger-600'
                            )}>
                              {m.difference > 0 ? '+' : ''}{formatCurrency(m.difference)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Missing Records */}
            {comparison.missingInNew.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-900 mb-2">
                  Missing in New File ({comparison.missingInNew.length})
                </h4>
                <div className="border border-danger-200 bg-danger-50 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {comparison.missingInNew.slice(0, 30).map((r, i) => (
                      <div key={i} className="text-xs text-danger-700 font-mono bg-white/60 rounded px-2 py-1">
                        {r.orderId} — {formatCurrency(r.totalAmount)}
                      </div>
                    ))}
                  </div>
                  {comparison.missingInNew.length > 30 && (
                    <p className="text-xs text-danger-500 mt-2">
                      ...and {comparison.missingInNew.length - 30} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {comparison.missingInOld.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-900 mb-2">
                  Missing in Old File ({comparison.missingInOld.length})
                </h4>
                <div className="border border-accent-200 bg-accent-50 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {comparison.missingInOld.slice(0, 30).map((r, i) => (
                      <div key={i} className="text-xs text-accent-700 font-mono bg-white/60 rounded px-2 py-1">
                        {r.orderId} — {formatCurrency(r.totalAmount)}
                      </div>
                    ))}
                  </div>
                  {comparison.missingInOld.length > 30 && (
                    <p className="text-xs text-accent-500 mt-2">
                      ...and {comparison.missingInOld.length - 30} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {comparison.summary.totalMismatches === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">✅</span>
                <h3 className="font-semibold text-accent-600">Perfect Match!</h3>
                <p className="text-sm text-surface-500">Both datasets are identical</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Summary Card Sub-component
function SummaryCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant: 'warning' | 'danger' | 'success' | 'info';
}) {
  const bgMap = {
    warning: 'bg-warning-50 border-warning-200',
    danger: 'bg-danger-50 border-danger-200',
    success: 'bg-accent-50 border-accent-200',
    info: 'bg-brand-50 border-brand-200',
  };

  return (
    <div className={cn('p-3 rounded-xl border', bgMap[variant])}>
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-lg font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-500">{label}</p>
    </div>
  );
}
