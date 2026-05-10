import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from './ui';

// ============================================
// Modal Component
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      {/* Content */}
      <div
        className={cn(
          'relative w-full bg-surface-0 rounded-2xl shadow-2xl animate-scale-in',
          'max-h-[90vh] flex flex-col',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// Confirm Dialog
// ============================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: 'text-danger-600',
    warning: 'text-warning-600',
    info: 'text-brand-600',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center py-2">
        <div
          className={cn(
            'mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4',
            variant === 'danger' && 'bg-danger-50',
            variant === 'warning' && 'bg-warning-50',
            variant === 'info' && 'bg-brand-50'
          )}
        >
          <span className={cn('text-2xl', variantStyles[variant])}>
            {variant === 'danger' ? '⚠️' : variant === 'warning' ? '⚡' : 'ℹ️'}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-surface-900 mb-2">{title}</h3>
        <p className="text-sm text-surface-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Name Confirm Dialog (type name to confirm)
// ============================================

interface NameConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clientName: string;
  isLoading?: boolean;
}

export function NameConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  isLoading = false,
}: NameConfirmDialogProps) {
  const [typedName, setTypedName] = React.useState('');
  const isMatch = typedName.trim() === clientName.trim();

  // Reset typed name when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) setTypedName('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Client" size="sm">
      <div className="space-y-4">
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
          <p className="text-sm text-danger-700">
            This action <strong>cannot be undone</strong>. All data associated with{' '}
            <strong>"{clientName}"</strong> will be permanently deleted, including files,
            processed data, and history.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-surface-700 block mb-1.5">
            Type <strong className="text-danger-600">"{clientName}"</strong> to confirm:
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type client name here..."
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2',
              isMatch
                ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-surface-300 focus:border-surface-400 focus:ring-surface-400/20'
            )}
            autoFocus
          />
          {typedName.length > 0 && !isMatch && (
            <p className="text-xs text-danger-500 mt-1">Name doesn't match</p>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!isMatch || isLoading}
            isLoading={isLoading}
          >
            Delete Permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
}

