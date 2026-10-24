import { useState, useEffect } from 'react';

let addToastHandler = null;

export function showToast(message, type = 'info') {
  if (addToastHandler) {
    addToastHandler(message, type);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastHandler = (message, type) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    return () => {
      addToastHandler = null;
    };
  }, []);

  return (
    <div className="fixed top-3 right-3 z-50 space-y-2 pointer-events-none max-w-xs w-full px-2">
      {toasts.map((toast) => {
        const bg =
          toast.type === 'error'
            ? 'bg-rose-500'
            : toast.type === 'success'
            ? 'bg-emerald-600'
            : 'bg-indigo-600';

        return (
          <div
            key={toast.id}
            className={`px-3 py-2 text-white text-xs font-semibold sharp-xs shadow-lg flex items-center justify-between gap-2 pointer-events-auto transform transition duration-200 ${bg}`}
          >
            <span className="truncate">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/80 hover:text-white font-bold ml-2 shrink-0"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
