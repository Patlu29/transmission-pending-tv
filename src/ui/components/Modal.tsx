import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  /** Escape or the backdrop: the caller decides what "close" means (the notice treats it as Back). */
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

/**
 * A modal dialog on the native `<dialog>`: focus is trapped and the page behind is inert. Focus
 * starts on the element marked `data-initial-focus` (the heading), and returns to the opener on close.
 */
export function Modal({ open, onClose, labelledBy, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${className ?? ''}`}
      aria-labelledby={labelledBy}
      onClose={() => {
        const el = opener.current;
        opener.current = null;
        onClose();
        if (el?.isConnected) el.focus();
      }}
    >
      {open && <div className="dialog__panel">{children}</div>}
    </dialog>
  );
}
