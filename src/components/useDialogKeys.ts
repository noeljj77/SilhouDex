import { type KeyboardEvent, type RefObject } from 'react';

/**
 * Keyboard behaviour for a modal dialog: Escape closes it, and Tab stays inside it instead of
 * wandering off to the page behind. Attach the returned handler to the dialog's container.
 */
export function useDialogKeys(panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
