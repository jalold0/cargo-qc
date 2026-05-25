import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';

// ============================================================
// Modal — markazlashgan dialog komponent
// ------------------------------------------------------------
// Xususiyatlar:
//   - ESC orqali yopish
//   - Click outside orqali yopish (closeOnBackdrop bilan o'chirish mumkin)
//   - Focus trap (asosiy element fokus oladi)
//   - role="dialog", aria-modal, aria-labelledby
//   - Tana scroll lock
//   - Slots: <Modal.Body>, <Modal.Footer>
//
// Sizes: sm (400px) | md (600px) | lg (800px) | xl (1100px)
//
// Namuna:
//   <Modal isOpen={open} onClose={() => setOpen(false)} title="Sarlavha">
//     <Modal.Body>...</Modal.Body>
//     <Modal.Footer>
//       <Button variant="ghost" onClick={close}>Bekor qilish</Button>
//       <Button onClick={save}>Saqlash</Button>
//     </Modal.Footer>
//   </Modal>
// ============================================================

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title = null,
  description = null,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef(null);

  // ESC orqali yopish + scroll lock
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);

    // Initial focus
    if (dialogRef.current) {
      const focusable = dialogRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={clsx(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800',
          'animate-slide-up',
          SIZE_CLASS[size] || SIZE_CLASS.md,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descId}
                  className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onClose}
                aria-label="Yopish"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function ModalBody({ children, className = '', ...rest }) {
  return (
    <div className={clsx('flex-1 overflow-y-auto px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

function ModalFooter({ children, className = '', ...rest }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { ModalBody, ModalFooter };
export default Modal;
