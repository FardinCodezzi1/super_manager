import { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, subtitle, maxWidth = 'max-w-sm', children }) {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className={`surface-card w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-4 shadow-2xl space-y-3.5 transform transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-col)' }}>
            <div className="min-w-0 pr-2">
              {title && <h3 className="text-sm font-bold text-DynamicMain truncate">{title}</h3>}
              {subtitle && <p className="text-[11px] text-DynamicMuted truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="tap-active p-1 text-DynamicMuted hover:text-DynamicMain sharp-xs text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
