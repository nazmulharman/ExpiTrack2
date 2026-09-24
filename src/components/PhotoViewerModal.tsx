import React, { useState } from 'react';
import { ItemPhoto } from '../types';

interface PhotoViewerModalProps {
  photo: ItemPhoto | null;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!photo) return null;

  const zoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.5));
  const zoomOut = () => setZoomLevel(prev => Math.max(1, prev - 0.5));
  const resetZoom = () => setZoomLevel(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="h-16 px-4 flex items-center justify-between text-white border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-[#6df5e1]">receipt_long</span>
          <h3 className="font-semibold text-sm truncate">{photo.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={photo.url}
            download={`${photo.title}.jpg`}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white"
            title="Open in new tab / download"
          >
            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          </a>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 select-none cursor-grab active:cursor-grabbing">
        <div
          className="transition-transform duration-200 max-w-full max-h-[80vh]"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={photo.url}
            alt={photo.title}
            className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl mx-auto"
          />
        </div>
      </div>

      {/* Bottom Floating Controls */}
      <div className="p-4 flex items-center justify-center gap-3">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white shadow-lg">
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= 1}
            className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-40 transition-colors"
            title="Zoom out"
          >
            <span className="material-symbols-outlined text-[20px]">zoom_out</span>
          </button>
          <span className="text-xs font-mono font-bold w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= 3}
            className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-40 transition-colors"
            title="Zoom in"
          >
            <span className="material-symbols-outlined text-[20px]">zoom_in</span>
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-xs font-semibold hover:bg-white/20 rounded-full transition-colors ml-1"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
