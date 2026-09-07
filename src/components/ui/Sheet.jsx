import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Shadcn-inspired Sheet Primitive
 * - Desktop (>= 768px): Slides in from the RIGHT (slide-over panel)
 * - Mobile (< 768px): Slides in from the BOTTOM (bottom sheet modal with drag handle)
 * - Contained independent scrolling with safe-area support
 * - WCAG 2.2 compliant: Focus management, Escape key listener, ARIA roles
 */
export default function Sheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md", // "sm" | "md" | "lg" | "xl" | "full"
  showClose = true,
  ariaLabel = "Dialog Panel"
}) {
  const sheetRef = useRef(null);
  const previouslyFocusedElement = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Handle Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement;

    // Lock body scroll strictly without jumping
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (onCloseRef.current) onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Focus initial element ONLY ONCE when opened, and never steal focus if user is already typing inside
    const timer = setTimeout(() => {
      if (sheetRef.current && !sheetRef.current.contains(document.activeElement)) {
        // Cari input atau textarea pertama di form/body, jangan fokus ke tombol silang header!
        const firstInput = sheetRef.current.querySelector(
          '.sheet-body input:not([type="hidden"]):not([disabled]), .sheet-body textarea:not([disabled]), .sheet-body select:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus();
        } else {
          sheetRef.current.focus();
        }
      }
    }, 60);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);

      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === "function") {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "sheet-size-sm",
    md: "sheet-size-md",
    lg: "sheet-size-lg",
    xl: "sheet-size-xl",
    full: "sheet-size-full"
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  const sheetElement = (
    <div 
      className="sheet-backdrop no-print" 
      onClick={(e) => {
        if (e.target === e.currentTarget && onCloseRef.current) onCloseRef.current();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || ariaLabel}
    >
      <div 
        ref={sheetRef}
        tabIndex={-1}
        className={`sheet-container ${selectedSizeClass}`}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="sheet-drag-handle-bar" aria-hidden="true">
          <div className="sheet-drag-handle" />
        </div>

        {/* Sheet Header */}
        {(title || showClose) && (
          <div className="sheet-header">
            <div className="sheet-header-text">
              {title && <h3 className="sheet-title">{title}</h3>}
              {description && <p className="sheet-desc">{description}</p>}
            </div>

            {showClose && (
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => onCloseRef.current && onCloseRef.current()}
                aria-label="Tutup panel dialog"
                title="Tutup (Esc)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Contained Scrollable Sheet Body */}
        <div className="sheet-body">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetElement, document.body);
}
