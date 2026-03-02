import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Reset zoom when switching images or opening
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && scale === 1) setCurrentIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight' && scale === 1) setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(5, s + 0.5));
      if (e.key === '-') { setScale((s) => { const ns = Math.max(1, s - 0.5); if (ns === 1) setPosition({ x: 0, y: 0 }); return ns; }); }
      if (e.key === '0') { setScale(1); setPosition({ x: 0, y: 0 }); }
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setScale((s) => {
        const ns = Math.max(1, Math.min(5, s + delta));
        if (ns === 1) setPosition({ x: 0, y: 0 });
        return ns;
      });
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('wheel', handleWheel);
      document.body.style.overflow = '';
    };
  }, [open, images.length, onClose, scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const zoomIn = () => setScale((s) => Math.min(5, s + 0.5));
  const zoomOut = () => {
    setScale((s) => {
      const ns = Math.max(1, s - 0.5);
      if (ns === 1) setPosition({ x: 0, y: 0 });
      return ns;
    });
  };
  const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  if (!open || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none"
      onClick={() => { if (scale === 1) onClose(); }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:text-white transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Zoom controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="p-1.5 text-white/80 hover:text-white transition-colors disabled:opacity-40"
          disabled={scale <= 1}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-white/80 text-xs min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="p-1.5 text-white/80 hover:text-white transition-colors disabled:opacity-40"
          disabled={scale >= 5}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        {scale > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="p-1.5 text-white/80 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && currentIndex > 0 && scale === 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i - 1); }}
          className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {images.length > 1 && currentIndex < images.length - 1 && scale === 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i + 1); }}
          className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:text-white transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt={`圖片 ${currentIndex + 1}`}
        className={`max-h-[90vh] max-w-[90vw] object-contain rounded-lg transition-transform ${
          isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
        }`}
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        draggable={false}
      />

      {/* Dots indicator */}
      {images.length > 1 && scale === 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Zoom hint */}
      {scale === 1 && (
        <div className="absolute bottom-6 right-6 text-white/40 text-xs">
          雙擊放大 · 滾輪縮放
        </div>
      )}
    </div>
  );
}
