import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, ActiveView, ExpiryItem, ItemPhoto, NotificationSettings, OCRResult, UserProfile, ConsumptionSchedule } from './types';
import {
  getStoredItems,
  saveStoredItems,
  getStoredNotificationSettings,
  saveStoredNotificationSettings,
  calculateVaultCounts,
} from './services/storage';
import {
  getStoredProfile,
  saveStoredProfile,
  initAuth,
  googleSignIn,
  googleSignOut,
  googleSwitchAccount,
  getAccessToken,
  DEFAULT_USER_PROFILE,
} from './services/googleAuth';
import {
  uploadVaultToDrive,
  downloadVaultFromDrive,
  findDriveBackups,
} from './services/googleDrive';
import { INITIAL_ITEMS, DEFAULT_NOTIFICATION_SETTINGS } from './data/initialData';
import { notificationService } from './services/notificationService';
import { recordDoseConsumption, getMedicineStockStats } from './utils/medicineUtils';
import { sounds } from './utils/soundUtils';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { DossierModal } from './components/DossierModal';
import { ConsumptionPromptModal } from './components/ConsumptionPromptModal';
import { AccountModal } from './components/AccountModal';
import { DashboardView } from './components/DashboardView';
import { ItemDetailView } from './components/ItemDetailView';
import { ScannerView } from './components/ScannerView';
import { ManualEntryView } from './components/ManualEntryView';
import { ArchiveView } from './components/ArchiveView';
import { AlertsView } from './components/AlertsView';
import { VaultView } from './components/VaultView';
import { NotificationSettingsView } from './components/NotificationSettingsView';
import { SettingsView } from './components/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { RecipeModal } from './components/RecipeModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { PublishApkModal } from './components/PublishApkModal';

export function App() {
  const [items, setItems] = useState<ExpiryItem[]>(() => getStoredItems());
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    getStoredNotificationSettings()
  );
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeView, setActiveView] = useState<ActiveView>('tab');
  const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null);

  // Modals
  const [activePhoto, setActivePhoto] = useState<ItemPhoto | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossierSingleItem, setDossierSingleItem] = useState<ExpiryItem | undefined>(undefined);
  const [recipeItem, setRecipeItem] = useState<ExpiryItem | null>(null);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPublishApkOpen, setIsPublishApkOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('expitrack_onboarding_completed') !== 'true';
  });

  // Consuming Schedule & Dose Alarm Modal
  const [promptItem, setPromptItem] = useState<ExpiryItem | null>(null);
  const [promptSchedule, setPromptSchedule] = useState<ConsumptionSchedule | undefined>(undefined);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  // Scanner transfer state
  const [detectedOCR, setDetectedOCR] = useState<OCRResult | null>(null);
  const [detectedImageUri, setDetectedImageUri] = useState<string | null>(null);

  // UI state
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('expitrack_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        sounds.playSuccessChime();
      } catch {}
      showToast(
        next === 'dark' ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️',
        next === 'dark' ? 'dark_mode' : 'light_mode'
      );
      return next;
    });
  };

  // Automated background schedule ticker: checks every 10 seconds for due consuming times
  useEffect(() => {
    // Request permission if not yet requested
    notificationService.requestPermission();

    const timer = setInterval(() => {
      notificationService.checkDueSchedules(items, (dueItem, dueSchedule) => {
        setPromptItem(dueItem);
        setPromptSchedule(dueSchedule);
        setIsPromptOpen(true);
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [items]);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setProfile((prev) => {
          const updated: UserProfile = {
            ...prev,
            name: user.displayName || prev.name,
            email: user.email || prev.email,
            avatarUrl: user.photoURL || prev.avatarUrl,
            isGoogleLinked: true,
            googleUid: user.uid,
          };
          saveStoredProfile(updated);
          return updated;
        });
      },
      () => {
        // Signed out state handled if needed
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Sync items to localStorage
  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  // Sync notification settings to localStorage
  useEffect(() => {
    saveStoredNotificationSettings(notificationSettings);
  }, [notificationSettings]);

  // Apply dark mode class to html & body elements and persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('expitrack_theme', themeMode);
    } catch {
      // ignore
    }
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [themeMode]);

  const showToast = (message: string, icon: string = 'check_circle') => {
    setToast({ message, icon });
  };

  const vaultCounts = useMemo(() => calculateVaultCounts(items), [items]);

  // Google Authentication Handlers
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      const updated: UserProfile = {
        ...profile,
        name: res.user.displayName || profile.name,
        email: res.user.email || profile.email,
        avatarUrl: res.user.photoURL || profile.avatarUrl,
        isGoogleLinked: true,
        googleUid: res.user.uid,
      };
      setProfile(updated);
      saveStoredProfile(updated);
      sounds.playSuccessChime();
      showToast(`Signed in as ${res.user.displayName || res.user.email}`, 'verified');
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      showToast('Google Sign-In canceled or failed', 'error');
      throw err;
    }
  };

  const handleSwitchAccount = async () => {
    try {
      const res = await googleSwitchAccount();
      const updated: UserProfile = {
        ...profile,
        name: res.user.displayName || res.user.email?.split('@')[0] || profile.name,
        email: res.user.email || profile.email,
        avatarUrl: res.user.photoURL || profile.avatarUrl,
        isGoogleLinked: true,
        googleUid: res.user.uid,
      };
      setProfile(updated);
      saveStoredProfile(updated);
      sounds.playSuccessChime();
      showToast(`Switched account to ${res.user.displayName || res.user.email}`, 'switch_account');
    } catch (err: any) {
      console.error('Account Switch failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Account switch canceled or failed', 'error');
      }
      throw err;
    }
  };

  const handleGoogleSignOut = async (resetToGuest = false) => {
    try {
      const updated = await googleSignOut(resetToGuest);
      setProfile(updated);
      saveStoredProfile(updated);
      showToast(resetToGuest ? 'Switched to Guest Vault' : 'Signed out from Google Account', 'logout');
    } catch (err: any) {
      console.error('Google Sign-Out failed:', err);
      showToast('Failed to sign out from Google', 'error');
    }
  };

  // Google Drive Cloud Backup Handlers
  const handleBackupToDrive = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const signinRes = await googleSignIn();
        token = signinRes.accessToken;
      } catch {
        showToast('Please sign in with Google to back up to Drive', 'lock');
        return;
      }
    }

    try {
      setIsBackingUp(true);
      showToast('Backing up vault to Google Drive...', 'cloud_upload');
      const backupInfo = await uploadVaultToDrive(items, notificationSettings, profile, token);
      const nowIso = new Date().toISOString();
      const updatedProfile: UserProfile = {
        ...profile,
        lastDriveBackup: nowIso,
      };
      setProfile(updatedProfile);
      saveStoredProfile(updatedProfile);
      showToast(`Vault successfully backed up to Google Drive!`, 'cloud_done');
    } catch (err: any) {
      console.error('Drive backup failed:', err);
      showToast(`Drive backup failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const signinRes = await googleSignIn();
        token = signinRes.accessToken;
      } catch {
        showToast('Please sign in with Google to restore from Drive', 'lock');
        return;
      }
    }

    try {
      setIsRestoring(true);
      showToast('Searching for backups on Google Drive...', 'search');
      const backups = await findDriveBackups(token);
      if (backups.length === 0) {
        showToast('No ExpiTrack backup file found in your Google Drive', 'info');
        return;
      }

      const backupFile = backups[0];
      const data = await downloadVaultFromDrive(backupFile.id, token);
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items);
        saveStoredItems(data.items);
      }
      if (data.notificationSettings) {
        setNotificationSettings(data.notificationSettings);
        saveStoredNotificationSettings(data.notificationSettings);
      }
      const nowIso = new Date().toISOString();
      const updatedProfile: UserProfile = {
        ...profile,
        lastDriveBackup: nowIso,
      };
      setProfile(updatedProfile);
      saveStoredProfile(updatedProfile);
      showToast(`Restored ${data.items.length} items from Google Drive!`, 'cloud_done');
    } catch (err: any) {
      console.error('Drive restore failed:', err);
      showToast(`Drive restore failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handlers for Items
  const handleSelectItem = (item: ExpiryItem) => {
    setSelectedItem(item);
    setActiveView('item-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveItem = (itemToSave: ExpiryItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === itemToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = itemToSave;
        return copy;
      }
      return [itemToSave, ...prev];
    });

    setSelectedItem(itemToSave);
    setActiveView('item-detail');
    setDetectedOCR(null);
    setDetectedImageUri(null);
    showToast(`"${itemToSave.name}" safely stored in Vault`, 'shield_lock');
  };

  const handleUpdateItem = (updatedItem: ExpiryItem) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === updatedItem.id ? updatedItem : i));
      saveStoredItems(next);
      return next;
    });
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItem(null);
    setActiveView('tab');
    showToast('Item deleted from Vault', 'delete');
  };

  const handleArchiveItem = (item: ExpiryItem, reason: 'concluded' | 'claimed' | 'consumed' | 'disposed' = 'concluded') => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: 'archived',
              resolvedDate: new Date().toISOString().split('T')[0],
              resolutionType: reason,
            }
          : i
      )
    );
    showToast(`"${item.name}" moved to Vault Archive`, 'inventory_2');
  };

  const handleRestoreItem = (item: ExpiryItem) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: 'active',
              resolutionType: undefined,
              resolvedDate: undefined,
            }
          : i
      )
    );
  };

  const handleToggleFavorite = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i))
    );
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleRestock = (item: ExpiryItem) => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const newExp = nextMonth.toISOString().split('T')[0];

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: 'active',
              expiryDate: newExp,
            }
          : i
      )
    );
    showToast(`Restocked "${item.name}". Expiry extended +30 days`, 'update');
  };

  // Consuming Schedule Handlers & Alarms
  const handleConfirmScheduledIntake = (
    item: ExpiryItem,
    amount: number,
    scheduleId?: string,
    scheduleLabel?: string
  ) => {
    const updated = recordDoseConsumption(item, amount, scheduleId, scheduleLabel);
    sounds.playSuccessChime();
    handleUpdateItem(updated);
    const stats = getMedicineStockStats(updated);
    showToast(
      `Confirmed intake of ${amount} ${stats.unit} for ${item.name}. ${stats.available} ${stats.unit} remaining.`,
      'check_circle'
    );
  };

  const handleSnoozeScheduledIntake = (item: ExpiryItem, minutes: number) => {
    if (promptSchedule) {
      notificationService.snoozeSchedule(item.id, promptSchedule.id, minutes);
    }
    showToast(`Dose for "${item.name}" snoozed for ${minutes} min`, 'snooze');
  };

  const handleTriggerAlarmPrompt = (item: ExpiryItem, schedule?: ConsumptionSchedule) => {
    setPromptItem(item);
    setPromptSchedule(schedule);
    setIsPromptOpen(true);
  };

  const handleConsume = (item: ExpiryItem) => {
    handleArchiveItem(item, 'consumed');
  };

  const handleResetData = () => {
    setItems([]);
    saveStoredItems([]);
    setProfile(DEFAULT_USER_PROFILE);
    saveStoredProfile(DEFAULT_USER_PROFILE);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setSelectedItem(null);
    setActiveView('tab');
    setActiveTab('dashboard');
  };

  const handleConfirmDetected = (ocr: OCRResult, imageUri?: string) => {
    setDetectedOCR(ocr);
    if (imageUri) setDetectedImageUri(imageUri);
    setSelectedItem(null);
    setActiveView('add-item');
  };

  const handleOpenDossier = (targetItems: ExpiryItem[]) => {
    setDossierSingleItem(undefined);
    setDossierOpen(true);
  };

  const handleOpenSingleDossier = (item: ExpiryItem) => {
    setDossierSingleItem(item);
    setDossierOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] dark:bg-[#131b2e] text-[#131b2e] dark:text-[#faf8ff] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col antialiased selection:bg-[#6df5e1]/40 selection:text-[#005c55]">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          icon={toast.icon}
          onClose={() => setToast(null)}
        />
      )}

      {/* Photo Viewer Modal */}
      {activePhoto && (
        <PhotoViewerModal
          photo={activePhoto}
          onClose={() => setActivePhoto(null)}
        />
      )}

      {/* Insurance Dossier Modal */}
      {dossierOpen && (
        <DossierModal
          items={items}
          singleItem={dossierSingleItem}
          onClose={() => setDossierOpen(false)}
        />
      )}

      {/* Zero-Waste Recipe Modal */}
      {recipeItem && (
        <RecipeModal
          item={recipeItem}
          onClose={() => setRecipeItem(null)}
          onMarkConsumed={(item) => {
            handleConsume(item);
            setRecipeItem(null);
          }}
        />
      )}

      {/* Consuming Alarm Notification Prompt Modal */}
      {isPromptOpen && promptItem && (
        <ConsumptionPromptModal
          item={promptItem}
          schedule={promptSchedule}
          onConfirmTaken={handleConfirmScheduledIntake}
          onSnooze={handleSnoozeScheduledIntake}
          onClose={() => {
            setIsPromptOpen(false);
            setPromptItem(null);
            setPromptSchedule(undefined);
          }}
        />
      )}

      {/* Onboarding Tour Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('expitrack_onboarding_completed', 'true');
            showToast('Welcome to ExpiTrack Personal Vault!', 'shield_lock');
          }}
        />
      )}

      {/* Profile Edit Modal */}
      {isProfileEditOpen && (
        <ProfileEditModal
          profile={profile}
          onSave={(updated) => {
            setProfile(updated);
            saveStoredProfile(updated);
          }}
          onClose={() => setIsProfileEditOpen(false)}
          onConnectGoogle={handleGoogleSignIn}
          onSwitchAccount={handleSwitchAccount}
          onSignOut={handleGoogleSignOut}
          showToast={showToast}
        />
      )}

      {/* Account Manager & Switcher Modal */}
      <AccountModal
        profile={profile}
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSwitchAccount={handleSwitchAccount}
        onSignOut={handleGoogleSignOut}
        onOpenProfileEdit={() => setIsProfileEditOpen(true)}
        onOpenSettings={() => setActiveView('settings')}
        onCloudSync={() => {
          setActiveView('settings');
        }}
        showToast={showToast}
      />

      {/* Android APK & Google Play Publishing Modal */}
      <PublishApkModal
        isOpen={isPublishApkOpen}
        onClose={() => setIsPublishApkOpen(false)}
        showToast={showToast}
      />

      {/* Header */}
      <Header
        activeTab={activeTab}
        activeView={activeView}
        profile={profile}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        onGoBack={() => {
          if (activeView === 'item-detail' || activeView === 'add-item' || activeView === 'edit-item' || activeView === 'notification-settings' || activeView === 'settings') {
            setActiveView('tab');
          } else {
            setActiveTab('dashboard');
          }
        }}
        onOpenSettings={() => {
          setActiveView('settings');
        }}
        onOpenAccount={() => {
          setIsAccountModalOpen(true);
        }}
        onCloudSync={() => {
          setActiveView('settings');
          showToast('Google Drive Vault & Cloud Backup Settings', 'cloud_sync');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-20">
        {/* VIEW ROUTER */}
        {activeView === 'item-detail' && selectedItem ? (
          <ItemDetailView
            item={selectedItem}
            onGoBack={() => setActiveView('tab')}
            onEditItem={(item) => {
              setSelectedItem(item);
              setActiveView('edit-item');
            }}
            onDeleteItem={handleDeleteItem}
            onArchiveItem={(item) => handleArchiveItem(item, 'concluded')}
            onToggleFavorite={handleToggleFavorite}
            onOpenPhotoViewer={(photo) => setActivePhoto(photo)}
            onOpenDossier={handleOpenSingleDossier}
            onUpdateItem={handleUpdateItem}
            showToast={showToast}
            onTriggerAlarmPrompt={handleTriggerAlarmPrompt}
          />
        ) : activeView === 'add-item' || activeView === 'edit-item' ? (
          <ManualEntryView
            initialItem={activeView === 'edit-item' ? selectedItem : null}
            detectedOCR={detectedOCR}
            detectedImageUri={detectedImageUri}
            onSaveItem={handleSaveItem}
            onCancel={() => {
              setActiveView('tab');
              setDetectedOCR(null);
              setDetectedImageUri(null);
            }}
            showToast={showToast}
          />
        ) : activeView === 'notification-settings' ? (
          <NotificationSettingsView
            settings={notificationSettings}
            onSave={(newSettings) => setNotificationSettings(newSettings)}
            onGoBack={() => setActiveView('tab')}
            showToast={showToast}
          />
        ) : activeView === 'settings' ? (
          <SettingsView
            items={items}
            profile={profile}
            themeMode={themeMode}
            onToggleTheme={handleToggleTheme}
            onResetData={handleResetData}
            onGoBack={() => setActiveView('tab')}
            onOpenProfileEdit={() => setIsProfileEditOpen(true)}
            onOpenOnboarding={() => setShowOnboarding(true)}
            onOpenPublishApk={() => setIsPublishApkOpen(true)}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            onSwitchAccount={handleSwitchAccount}
            onBackupToDrive={handleBackupToDrive}
            onRestoreFromDrive={handleRestoreFromDrive}
            isBackingUp={isBackingUp}
            isRestoring={isRestoring}
            showToast={showToast}
          />
        ) : (
          /* TAB ROUTER */
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                items={items}
                onSelectItem={handleSelectItem}
                onOpenScanner={() => {
                  setActiveTab('scan');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenManualEntry={() => {
                  setSelectedItem(null);
                  setActiveView('add-item');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenRecipes={(item) => setRecipeItem(item)}
                onArchiveItem={(item) => handleArchiveItem(item, 'concluded')}
                onConsumeItem={handleConsume}
                onRestockItem={handleRestock}
                onUpdateItem={handleUpdateItem}
                showToast={showToast}
                vaultCounts={vaultCounts}
              />
            )}

            {activeTab === 'scan' && (
              <ScannerView
                onConfirmDetected={handleConfirmDetected}
                onGoToManual={() => {
                  setSelectedItem(null);
                  setActiveView('add-item');
                }}
                onGoBack={() => setActiveTab('dashboard')}
                showToast={showToast}
              />
            )}

            {activeTab === 'archive' && (
              <ArchiveView
                items={items}
                onRestoreItem={handleRestoreItem}
                onPermanentlyDeleteItem={(id) => {
                  setItems((prev) => prev.filter((i) => i.id !== id));
                }}
                onOpenPhotoViewer={(photo) => setActivePhoto(photo)}
                onOpenDossier={handleOpenDossier}
                showToast={showToast}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsView
                items={items}
                notificationSettings={notificationSettings}
                onOpenItemDetail={handleSelectItem}
                onOpenNotificationSettings={() => setActiveView('notification-settings')}
                onMarkConsumed={handleConsume}
                onUpdateItem={handleUpdateItem}
                showToast={showToast}
                onTriggerAlarmPrompt={handleTriggerAlarmPrompt}
              />
            )}

            {activeTab === 'vault' && (
              <VaultView
                items={items}
                profile={profile}
                onOpenDossier={handleOpenDossier}
                onOpenPublishApk={() => setIsPublishApkOpen(true)}
                onBackupToDrive={handleBackupToDrive}
                onRestoreFromDrive={handleRestoreFromDrive}
                onConnectGoogle={handleGoogleSignIn}
                isBackingUp={isBackingUp}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      {activeView === 'tab' && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          urgentAlertsCount={vaultCounts.critical}
        />
      )}
    </div>
  );
}
export default App;
