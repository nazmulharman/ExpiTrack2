export function getDaysRemaining(expiryDateStr: string): number {
  const expiry = new Date(expiryDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface ExpiryStatusInfo {
  label: string;
  badgeClass: string;
  dotClass: string;
  isUrgent: boolean;
  isExpired: boolean;
  days: number;
}

export function getExpiryStatus(expiryDateStr: string): ExpiryStatusInfo {
  const days = getDaysRemaining(expiryDateStr);

  if (days < 0) {
    const abs = Math.abs(days);
    return {
      label: abs === 1 ? 'Expired 1d ago' : `Expired ${abs}d ago`,
      badgeClass: 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]',
      dotClass: 'bg-[#ba1a1a]',
      isUrgent: true,
      isExpired: true,
      days,
    };
  }

  if (days === 0) {
    return {
      label: 'Expires Today',
      badgeClass: 'bg-[#ffdad6] text-[#ba1a1a] font-bold border border-[#ffb4ab]',
      dotClass: 'bg-[#ba1a1a] animate-ping',
      isUrgent: true,
      isExpired: false,
      days,
    };
  }

  if (days === 1) {
    return {
      label: '1 day left',
      badgeClass: 'bg-[#ffedd5] text-[#c2410c] font-bold border border-[#fed7aa]',
      dotClass: 'bg-[#ea580c]',
      isUrgent: true,
      isExpired: false,
      days,
    };
  }

  if (days <= 7) {
    return {
      label: `${days} days left`,
      badgeClass: 'bg-[#fef3c7] text-[#92400e] font-bold border border-[#fde68a]',
      dotClass: 'bg-[#f59e0b]',
      isUrgent: true,
      isExpired: false,
      days,
    };
  }

  if (days <= 30) {
    return {
      label: `${days} days left`,
      badgeClass: 'bg-[#eaedff] text-[#131b2e] font-semibold border border-[#dae2fd]',
      dotClass: 'bg-[#005c55]',
      isUrgent: false,
      isExpired: false,
      days,
    };
  }

  return {
    label: `${days} days left`,
    badgeClass: 'bg-[#6df5e1]/40 text-[#006f64] font-semibold border border-[#6df5e1]/60',
    dotClass: 'bg-[#006b5f]',
    isUrgent: false,
    isExpired: false,
    days,
  };
}

export function calculateTimeline(purchaseDateStr: string, expiryDateStr: string) {
  const purchase = new Date(purchaseDateStr + 'T00:00:00');
  const expiry = new Date(expiryDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDurationDays = Math.max(1, Math.ceil((expiry.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24)));
  const lapsedDays = Math.max(0, Math.ceil((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24)));
  const percentage = Math.min(100, Math.max(0, (lapsedDays / totalDurationDays) * 100));

  return {
    totalDurationDays,
    lapsedDays: Math.min(lapsedDays, totalDurationDays),
    percentage: Math.round(percentage * 10) / 10,
  };
}
