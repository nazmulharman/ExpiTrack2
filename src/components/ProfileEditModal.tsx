import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface ProfileEditModalProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
  onConnectGoogle?: () => void;
  onSwitchAccount?: () => void;
  onSignOut?: () => void;
  showToast: (msg: string, icon?: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBB7G2BsxWV50oC351wFNgWUC69Bvr4pFMoWqqRGMpvcIvISIZC5g1ll9PrVeJ9kg1bUShitSK1pRgjaz7tvWuxMF1GS14w8I6UO4G_ByqjPtxnlvY_RgA0-mSkQOmYlUoCVFRdWnG-Tmn3oKUlOeimo-yTCIKyfZv_6LWu64EGh0sb64Qh2gSSvZa97Hj5x4IScmVN4g00fjP0yuy6-sxzQUhXDfJEt7YOOsHCzSCMPXBpFwQa-XiS',
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  profile,
  onSave,
  onClose,
  onConnectGoogle,
  onSwitchAccount,
  onSignOut,
  showToast,
}) => {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [vaultName, setVaultName] = useState(profile.vaultName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatarUrl(result);
        showToast('Profile photo updated from device', 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }

    const updated: UserProfile = {
      ...profile,
      name: name.trim(),
      email: email.trim(),
      vaultName: vaultName.trim() || `${name.trim()}'s Vault`,
      avatarUrl,
    };

    onSave(updated);
    showToast('Profile details updated successfully', 'check_circle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131b2e] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-[#eaedff] dark:border-[#283044] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#005c55] to-[#0f766e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-[#6df5e1]">
              <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3faef]">
                Account Settings
              </span>
              <h2 className="text-base font-bold">Edit Profile & Vault Info</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#f2f3ff] dark:bg-[#283044]">
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={name}
                className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white dark:border-[#131b2e]"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Upload Photo"
              >
                <span className="material-symbols-outlined text-[24px]">photo_camera</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Avatar Preset Choices */}
            <div className="flex items-center gap-2">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(preset)}
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                    avatarUrl === preset
                      ? 'border-[#005c55] scale-110 shadow-xs'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] flex items-center justify-center text-[#005c55] dark:text-[#6df5e1] hover:bg-[#eaedff] transition-colors"
                title="Upload from device"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
              </button>
            </div>

            {/* Custom URL Input toggle */}
            {!showCustomUrl ? (
              <button
                type="button"
                onClick={() => setShowCustomUrl(true)}
                className="text-[11px] font-semibold text-[#005c55] dark:text-[#6df5e1] hover:underline"
              >
                Or enter image URL
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full max-w-xs mt-1">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-[#131b2e] border border-[#eaedff] dark:border-[#283044] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      setAvatarUrl(customAvatarInput.trim());
                      setCustomAvatarInput('');
                      setShowCustomUrl(false);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#005c55] text-white text-xs font-bold"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#131b2e] dark:text-white mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nazmul Hoque"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-semibold text-[#131b2e] dark:text-white focus:ring-2 focus:ring-[#005c55] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#131b2e] dark:text-white mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. nazmulsa213@gmail.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-semibold text-[#131b2e] dark:text-white focus:ring-2 focus:ring-[#005c55] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#131b2e] dark:text-white mb-1">
                Household / Vault Title
              </label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="e.g. Nazmul's Master Vault"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] text-xs font-semibold text-[#131b2e] dark:text-white focus:ring-2 focus:ring-[#005c55] focus:outline-none"
              />
            </div>

            {/* Google Account Status Badge */}
            <div className="p-3 rounded-xl bg-[#f2f3ff] dark:bg-[#283044] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#131b2e] dark:text-white">
                    Google Identity & Drive
                  </span>
                  <span className="text-[10px] text-[#3e4947] dark:text-[#bdc9c6]">
                    {profile.isGoogleLinked ? 'Connected to Google Account' : 'Not yet linked'}
                  </span>
                </div>
              </div>

              {profile.isGoogleLinked ? (
                <div className="flex items-center gap-1.5">
                  {onSwitchAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchAccount();
                      }}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1] text-[11px] font-bold border border-[#eaedff] dark:border-[#283044] hover:bg-slate-50 transition-colors flex items-center gap-1"
                      title="Switch Google Account"
                    >
                      <span className="material-symbols-outlined text-[13px]">switch_account</span>
                      <span>Switch</span>
                    </button>
                  )}
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSignOut();
                      }}
                      className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[11px] font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                      title="Sign Out"
                    >
                      <span className="material-symbols-outlined text-[13px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              ) : onConnectGoogle ? (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#131b2e] text-[#005c55] dark:text-[#6df5e1] text-xs font-bold border border-[#eaedff] dark:border-[#283044] hover:bg-slate-50 transition-colors"
                >
                  Link Google
                </button>
              ) : null}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3e4947] dark:text-[#bdc9c6] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#005c55] hover:bg-[#0f766e] text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
