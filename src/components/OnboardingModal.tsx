import React, { useState } from 'react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Never Lose a Warranty Claim',
      subtitle: 'Track electronics, appliances, and purchases with photo proof of receipts, barcodes, and serial stamps before your coverage expires.',
      icon: 'verified_user',
      iconColor: 'text-[#6df5e1]',
      gradient: 'from-[#0f766e] to-[#005c55]',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqtNRUcg_UQjr_Ii1XEb0kOa9fzm_-fSmTe9sZDnjs7I21e3HC6cjU1ZIrgDUn4QptCX9bZS6t6N6E15lB4rRZppE3a66qP-wrTwwbTXJygv_4cWRvNb-f4Ah81gRNBd56-MVu4ivtziHFxTf6yQR5ddCeaOWJyna4vuGhMeYkOQeUhALfZtIas-ING_gvusvBsTX2oSvHfe28yNLuP9v79thP9VtGCS64hLEXfoMdkq5NOc6uDe8s',
      highlightBadge: '🛡️ $1,480+ Average Saved',
    },
    {
      title: 'Stop Medicine & Food Waste',
      subtitle: 'Keep your medicine cabinet safe and reduce grocery spoilage. Staggered reminders alert you 30, 7, and 1 day before expiration.',
      icon: 'health_and_safety',
      iconColor: 'text-[#ffdad6]',
      gradient: 'from-[#005c55] to-[#134e48]',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6NfAnzwuuSuw5u6JB86NWoMc-dFZMVjKzQ-MvsfeO8i6Wvv07D1mcIKYi9wgOxWJ76ls2BknOg5vDxg7evRw7vRSvXd3HJVIiS3K-keudCVmNnp6E2mUCJCn6UD6XTCLnb8TfVJmhVxvqtZHjKbcIbE3Z5z-ofJl49QCHtNB3cGZzwZA11FBeV2FrnxOvB8s7jeR2NmI9FObgJ-6Gati1Yw6OS43BH-_p9CUBJCXCuVB2w3rYO57M',
      highlightBadge: '💊 Health & Safety Guard',
    },
    {
      title: 'Auto OCR Scanner & Vault',
      subtitle: 'Snap a picture of any bottle label or store receipt. ExpiTrack automatically detects product names and dates with 98% optical precision.',
      icon: 'document_scanner',
      iconColor: 'text-[#6df5e1]',
      gradient: 'from-[#0f766e] to-[#042f2c]',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfCaxATu4sf-75iJyggHzIkCSnFOY0ixkzrq2CPc84_XQa0G4giBgH4yh9c-BvYbU6CnK6T7lEz28AtVX7y0O8hDScpHYg2ofmFPINzCBUdmqpRDf61ljyzK9rPIu4-_0lPeNNy6Kbo2U7gFr2uykZpPvmu_ZJWQQK1surSLySmV8YGRHfXHgHi7AXLji4o-i6V4ggQrAT_FBzruPhfWT-mjCaF0ZUd3a93UaJkYp8mQrP1ObFrUOZ',
      highlightBadge: '⚡ Instant AI Recognition',
    },
  ];

  const slide = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-[#131b2e] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#eaedff] dark:border-[#283044] max-h-[92vh]">
        {/* Top bar with Skip */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://lh3.googleusercontent.com/aida/AEtjO1U5U0JV-qKAx9hwch6ezL0VvvLxorsvKCJy4WtE07JyNue3FvkZBN21UlDZvyJA0O21367XxzLJVVUcwO9U5wQ9IG1OjZi9yleAts3DI9n_bss3qvI_SCRHOH5ljgRgxvWP1g7adpwp2uufU3z2CY7nLdKKUcLSNyE5IlJTAGEwMSRCSwBa1sae4bNR5LYg1PJpIqsrRyBQXUWP9GJFTHQhvbG7cduRSfRo4sEq33v_PsSHia1cqP62OY4"
              alt="Logo"
              className="h-6 w-auto"
            />
            <span className="font-bold text-sm text-[#131b2e] dark:text-white">ExpiTrack</span>
          </div>

          <button
            onClick={onComplete}
            className="text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:text-[#005c55] px-2.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Visual Hero */}
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-900 mx-auto">
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover transition-all duration-500 transform hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none"></div>

          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
              {slide.highlightBadge}
            </span>
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {slide.icon}
              </span>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-[#131b2e] dark:text-white leading-tight">
              {slide.title}
            </h2>
            <p className="text-xs text-[#3e4947] dark:text-[#bdc9c6] leading-relaxed">
              {slide.subtitle}
            </p>
          </div>

          {/* Stepper Dots & Action Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx
                      ? 'w-7 bg-[#005c55] dark:bg-[#6df5e1]'
                      : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full h-12 rounded-2xl bg-[#005c55] hover:bg-[#0f766e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <span>{currentSlide === slides.length - 1 ? 'Start Using ExpiTrack' : 'Continue'}</span>
              <span className="material-symbols-outlined text-[18px]">
                {currentSlide === slides.length - 1 ? 'check' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
