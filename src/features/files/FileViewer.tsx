import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { cn, formatCurrency } from '@/utils';
import { Input } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StandardizedRecord } from '@/types';

// ============================================
// Excel Table Viewer
// ============================================

interface DataTableViewerProps {
  data: StandardizedRecord[];
  title?: string;
}

export function DataTableViewer({ data, title }: DataTableViewerProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<StandardizedRecord>[]>(
    () => [
      {
        accessorKey: 'orderId',
        header: 'Order ID',
        size: 160,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: 100,
      },
      {
        accessorKey: 'productName',
        header: 'Product',
        size: 200,
        cell: ({ getValue }) => (
          <span className="truncate block max-w-[200px]" title={String(getValue())}>
            {String(getValue()) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'state',
        header: 'State',
        size: 140,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        size: 60,
      },
      {
        accessorKey: 'taxableAmount',
        header: 'Taxable Amt',
        size: 120,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
        ),
      },
      {
        accessorKey: 'cgstAmount',
        header: 'CGST',
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
        ),
      },
      {
        accessorKey: 'sgstAmount',
        header: 'SGST',
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
        ),
      },
      {
        accessorKey: 'igstAmount',
        header: 'IGST',
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
        ),
      },
      {
        accessorKey: 'gstAmount',
        header: 'Total GST',
        size: 110,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-semibold text-brand-600">
            {formatCurrency(Number(getValue()))}
          </span>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        size: 120,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-bold text-accent-600">
            {formatCurrency(Number(getValue()))}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {title && (
          <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Input
            placeholder="Search records..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="w-60 text-xs"
          />
          <span className="text-xs text-surface-500 whitespace-nowrap">
            {table.getFilteredRowModel().rows.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-surface-600 border-b border-surface-200 whitespace-nowrap cursor-pointer select-none hover:bg-surface-100 transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUp className="w-3 h-3" />,
                          desc: <ChevronDown className="w-3 h-3" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ChevronsUpDown className="w-3 h-3 text-surface-300" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-surface-100">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-2 text-xs text-surface-700 whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-200 bg-surface-50">
          <span className="text-xs text-surface-500">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded text-surface-500 hover:bg-surface-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded text-surface-500 hover:bg-surface-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// JSON Viewer
// ============================================

interface JsonViewerProps {
  data: unknown;
  title?: string;
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  const formattedJson = JSON.stringify(data, null, 2);

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      )}
      <pre className="bg-surface-900 text-surface-100 rounded-xl p-4 overflow-auto max-h-[500px] text-xs font-mono leading-relaxed">
        {formattedJson}
      </pre>
    </div>
  );
}

// ============================================
// File Viewer Modal
// ============================================

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StandardizedRecord[] | null;
  jsonData?: unknown;
  title: string;
  mode?: 'table' | 'json';
}

export function FileViewerModal({
  isOpen,
  onClose,
  data,
  jsonData,
  title,
  mode = 'table',
}: FileViewerModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="full">
      {mode === 'table' && data ? (
        <DataTableViewer data={data} />
      ) : (
        <JsonViewer data={jsonData || data} />
      )}
    </Modal>
  );
}
