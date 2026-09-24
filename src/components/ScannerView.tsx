import React, { useState, useRef, useEffect } from 'react';
import { OCRResult } from '../types';
import { SCAN_PRESETS, simulateOCRScan } from '../services/ocr';

interface ScannerViewProps {
  onConfirmDetected: (detected: OCRResult, imageUri?: string) => void;
  onGoToManual: () => void;
  onGoBack: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onConfirmDetected,
  onGoToManual,
  onGoBack,
  showToast,
}) => {
  const [activeMode, setActiveMode] = useState<'ocr' | 'receipt' | 'barcode' | 'manual'>('ocr');
  const [flashOn, setFlashOn] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedResult, setDetectedResult] = useState<OCRResult>(SCAN_PRESETS[0].result);
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activePreset = SCAN_PRESETS[selectedPresetIndex];
  const activeImage = customImageUri || activePreset.image;

  // Toggle live camera
  const toggleLiveCamera = async () => {
    if (useLiveCamera) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setUseLiveCamera(false);
      showToast('Switched to simulated optical target', 'photo');
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          showToast('Live camera is not supported on this device/browser', 'videocam_off');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        setCameraStream(stream);
        setUseLiveCamera(true);
        setCustomImageUri(null);
        showToast('Live camera optical feed connected', 'videocam');
      } catch (err) {
        console.warn('Camera access denied or unavailable', err);
        showToast('Camera access unavailable. Using high-res simulated sample.', 'info');
      }
    }
  };

  // Attach stream to video tag
  useEffect(() => {
    if (useLiveCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useLiveCamera, cameraStream]);

  // When preset index changes, update detected result
  useEffect(() => {
    if (!customImageUri && !useLiveCamera) {
      setDetectedResult(SCAN_PRESETS[selectedPresetIndex].result);
    }
  }, [selectedPresetIndex, customImageUri, useLiveCamera]);

  const handleCapture = async () => {
    setIsScanning(true);
    showToast('Optical Anchor Locked. Extracting text...', 'document_scanner');
    try {
      let imageToAnalyze = activeImage;

      // If using live camera, grab frame from video element
      if (useLiveCamera && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          imageToAnalyze = capturedDataUrl;
          setCustomImageUri(capturedDataUrl);
        }
      }

      const result = await simulateOCRScan(imageToAnalyze);
      setDetectedResult(result);
      showToast(`Detected: ${result.productName}`, 'check_circle');
    } catch {
      showToast('Scan completed', 'check');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const uri = event.target?.result as string;
        setCustomImageUri(uri);
        setIsScanning(true);
        showToast('Processing uploaded document...', 'upload');
        const res = await simulateOCRScan(uri);
        setDetectedResult(res);
        setIsScanning(false);
        showToast('Details extracted from uploaded photo!', 'verified');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    onConfirmDetected(detectedResult, activeImage);
  };

  return (
    <div className="flex flex-col w-full relative select-none pb-28 pt-2">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Hidden canvas for video snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Mode Pill Quick Switcher */}
      <div className="flex items-center justify-between gap-1 mb-3 overflow-x-auto no-scrollbar py-1">
        <div className="inline-flex p-1 bg-[#eaedff] dark:bg-[#283044] rounded-full shadow-xs">
          <button
            onClick={() => setActiveMode('ocr')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMode === 'ocr'
                ? 'bg-[#005c55] text-white shadow-sm'
                : 'text-[#3e4947] dark:text-[#bdc9c6]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">document_scanner</span>
            Auto OCR
          </button>

          <button
            onClick={() => {
              setActiveMode('receipt');
              setSelectedPresetIndex(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMode === 'receipt'
                ? 'bg-[#005c55] text-white shadow-sm'
                : 'text-[#3e4947] dark:text-[#bdc9c6]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            Receipt
          </button>

          <button
            onClick={() => {
              setActiveMode('barcode');
              setSelectedPresetIndex(0);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMode === 'barcode'
                ? 'bg-[#005c55] text-white shadow-sm'
                : 'text-[#3e4947] dark:text-[#bdc9c6]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">barcode_scanner</span>
            Barcode
          </button>

          <button
            onClick={onGoToManual}
            className="px-3 py-1.5 rounded-full text-[#3e4947] dark:text-[#bdc9c6] text-xs font-semibold transition-all flex items-center gap-1.5 hover:text-[#005c55]"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            Manual
          </button>
        </div>

        {/* Quick Utilities */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLiveCamera}
            aria-label="Toggle Live Camera"
            title={useLiveCamera ? 'Switch to Preset Samples' : 'Activate Live Camera'}
            className={`w-9 h-9 rounded-full bg-[#eaedff] dark:bg-[#283044] flex items-center justify-center transition-transform active:scale-95 ${
              useLiveCamera ? 'text-[#005c55] dark:text-[#6df5e1] font-bold ring-2 ring-[#005c55]' : 'text-[#3e4947] dark:text-[#bdc9c6]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {useLiveCamera ? 'videocam' : 'videocam_off'}
            </span>
          </button>

          <button
            onClick={() => {
              setFlashOn(!flashOn);
              showToast(flashOn ? 'Flash turned off' : 'Flash turned on', 'flash_on');
            }}
            aria-label="Toggle Flash"
            className={`w-9 h-9 rounded-full bg-[#eaedff] dark:bg-[#283044] flex items-center justify-center transition-transform active:scale-95 ${
              flashOn ? 'text-[#005c55] font-bold' : 'text-[#3e4947] dark:text-[#bdc9c6]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {flashOn ? 'flash_on' : 'flash_off'}
            </span>
          </button>

          <button
            onClick={() => setGridOn(!gridOn)}
            aria-label="Toggle Grid"
            className={`w-9 h-9 rounded-full bg-[#eaedff] dark:bg-[#283044] flex items-center justify-center transition-transform active:scale-95 ${
              gridOn ? 'text-[#005c55] font-bold' : 'text-[#3e4947] dark:text-[#bdc9c6]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">grid_4x4</span>
          </button>
        </div>
      </div>

      {/* Preset Target Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#3e4947] dark:text-[#bdc9c6] shrink-0 pl-1">
          {useLiveCamera ? 'Active:' : 'Sample:'}
        </span>
        {useLiveCamera ? (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#6df5e1]/40 text-[#006f64] dark:text-[#6df5e1] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#006f64] animate-ping"></span>
            Live Camera Stream
          </span>
        ) : (
          SCAN_PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              onClick={() => {
                setCustomImageUri(null);
                setSelectedPresetIndex(idx);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                !customImageUri && selectedPresetIndex === idx
                  ? 'bg-[#005c55] text-white shadow-xs'
                  : 'bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-[#3e4947] dark:text-[#bdc9c6]'
              }`}
            >
              {preset.label}
            </button>
          ))
        )}
      </div>

      {/* Camera Viewfinder Stage */}
      <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-md bg-slate-900 flex items-center justify-center">
        {/* Live Video Feed or Simulated Sensor Feed */}
        {useLiveCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-300"
            style={{ backgroundImage: `url('${activeImage}')` }}
          ></div>
        )}

        {/* Viewfinder Darkening Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/65 pointer-events-none"></div>

        {/* Optical Target Grid (3x3) */}
        {gridOn && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/20 m-0.5 rounded-xs"></div>
            ))}
          </div>
        )}

        {/* Active Scanning Beam */}
        <div className="absolute inset-x-4 top-0 h-1 bg-[#71f8e4] shadow-[0_0_12px_#71f8e4] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] opacity-90 pointer-events-none"></div>

        {/* Live Frame Brackets */}
        <div className="absolute inset-6 rounded-2xl pointer-events-none border-2 border-dashed border-[#71f8e4]/60">
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#71f8e4] rounded-tl-lg"></div>
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#71f8e4] rounded-tr-lg"></div>
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#71f8e4] rounded-bl-lg"></div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#71f8e4] rounded-br-lg"></div>
        </div>

        {/* OCR Bounding Box 1: Product Name Detection */}
        <div className="absolute top-1/4 left-6 right-10 z-20 transition-all duration-300">
          <div className="relative p-2.5 rounded-xl bg-white/95 dark:bg-[#131b2e]/95 text-[#131b2e] dark:text-white backdrop-blur-md shadow-xl flex items-center justify-between border border-white/20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#005c55] animate-ping"></span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#005c55] dark:text-[#6df5e1] uppercase tracking-wider">
                  Product Name Detected
                </span>
                <span className="text-sm font-bold truncate max-w-[190px]">
                  {detectedResult.productName}
                </span>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#6df5e1] flex items-center justify-center text-[#006f64] shrink-0">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
          </div>
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#71f8e4] shadow"></div>
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#71f8e4] shadow"></div>
        </div>

        {/* OCR Bounding Box 2: Expiry Date Detection */}
        <div className="absolute top-1/2 left-8 right-6 z-20 transition-all duration-300">
          <div className="relative p-2.5 rounded-xl bg-[#0f766e] text-white shadow-2xl flex items-center justify-between border border-[#a3faef]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#005c55] flex items-center justify-center text-white shrink-0">
                <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#a3faef] uppercase">
                    Expiry Date ({detectedResult.confidence}%)
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#6df5e1] text-[#006f64] text-[9px] font-bold">
                    Verified
                  </span>
                </div>
                <span className="text-base font-extrabold text-white">
                  {detectedResult.expiryDate}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#a3faef] block">Status</span>
              <span className="text-xs font-bold text-[#71f8e4]">Valid OCR</span>
            </div>
          </div>
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#71f8e4] shadow"></div>
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#71f8e4] shadow"></div>
        </div>

        {/* Real-time HUD Status Stamp */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none text-white text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-[#71f8e4]">sensors</span>
            Optical Anchor Locked
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md shadow-sm">
            <span className="material-symbols-outlined text-[14px]">macro_auto</span>
            AF Track 1.2m
          </div>
        </div>
      </div>

      {/* Detected Information Bottom Sheet Card */}
      <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-[#131b2e] shadow-sm border border-[#eaedff] dark:border-[#283044] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#005c55]"></span>
            <h2 className="font-bold text-sm text-[#131b2e] dark:text-white">
              Recognized {detectedResult.detectedElements.length} items from label
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#eaedff] dark:bg-[#283044] text-[11px] font-bold text-[#005c55] dark:text-[#6df5e1]">
            Smart AI Filter
          </span>
        </div>

        {/* Summary Details Micro Bento */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col">
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Asset Class</span>
            <span className="font-bold text-xs text-[#131b2e] dark:text-white truncate">
              {detectedResult.subCategory}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex flex-col">
            <span className="text-[11px] text-[#3e4947] dark:text-[#bdc9c6]">Target Pantry / Cabinet</span>
            <span className="font-bold text-xs text-[#005c55] dark:text-[#6df5e1] truncate">
              {detectedResult.storageLocation}
            </span>
          </div>
        </div>

        {/* CTA: Use Detected Info */}
        <button
          onClick={handleConfirm}
          className="w-full h-12 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
        >
          <span>Use Detected Info</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>

      {/* Capture Control Deck */}
      <div className="mt-3 flex items-center justify-between px-6">
        {/* Gallery Upload */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload photo from device gallery"
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] overflow-hidden shadow-sm flex items-center justify-center text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">photo_library</span>
          </button>
          <span className="text-[10px] font-semibold text-[#3e4947] dark:text-[#bdc9c6] mt-1">Gallery</span>
        </div>

        {/* Hero Tactile Shutter */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleCapture}
            disabled={isScanning}
            aria-label="Take Photo Scan"
            className="relative w-18 h-18 rounded-full bg-white dark:bg-[#131b2e] shadow-xl flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="absolute inset-1 rounded-full bg-[#71f8e4]/40 animate-ping"></span>
            <div className="w-14 h-14 rounded-full bg-[#0f766e] flex items-center justify-center shadow-md">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-[#131b2e] flex items-center justify-center text-[#005c55] dark:text-[#6df5e1] shadow-xs">
                <span className="material-symbols-outlined text-[24px]">
                  {isScanning ? 'sync' : 'center_focus_strong'}
                </span>
              </div>
            </div>
          </button>
          <span className="text-[11px] font-bold text-[#005c55] dark:text-[#6df5e1] mt-1.5">
            {isScanning ? 'Scanning...' : 'Auto Capture Ready'}
          </span>
        </div>

        {/* Flip Lens / Cycle Preset */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setCustomImageUri(null);
              setSelectedPresetIndex(prev => (prev + 1) % SCAN_PRESETS.length);
              showToast('Switched optical target preset', 'flip_camera_ios');
            }}
            aria-label="Cycle target preset"
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] text-[#3e4947] dark:text-[#bdc9c6] shadow-sm flex items-center justify-center active:rotate-180 transition-transform duration-300"
          >
            <span className="material-symbols-outlined text-[22px]">flip_camera_ios</span>
          </button>
          <span className="text-[10px] font-semibold text-[#3e4947] dark:text-[#bdc9c6] mt-1">Flip Lens</span>
        </div>
      </div>
    </div>
  );
};
