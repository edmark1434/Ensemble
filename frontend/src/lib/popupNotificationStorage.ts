// Helper for archiving notifications from the header popup while keeping them in /notifications full view

const STORAGE_PREFIX = "ensemble_popup_archive_";

interface ArchiveData {
  archivedIds: string[];
  archivedBefore: string | null;
}

function getKey(accountId?: string): string {
  return `${STORAGE_PREFIX}${accountId || "default"}`;
}

export function getPopupArchiveData(accountId?: string): ArchiveData {
  try {
    const raw = localStorage.getItem(getKey(accountId));
    if (!raw) return { archivedIds: [], archivedBefore: null };
    const parsed = JSON.parse(raw);
    return {
      archivedIds: Array.isArray(parsed.archivedIds) ? parsed.archivedIds : [],
      archivedBefore: typeof parsed.archivedBefore === "string" ? parsed.archivedBefore : null,
    };
  } catch {
    return { archivedIds: [], archivedBefore: null };
  }
}

export function archivePopupNotification(notificationId: string, accountId?: string): void {
  try {
    const current = getPopupArchiveData(accountId);
    if (!current.archivedIds.includes(notificationId)) {
      current.archivedIds.push(notificationId);
      localStorage.setItem(getKey(accountId), JSON.stringify(current));
    }
  } catch {
    // ignore localStorage errors
  }
}

export function archiveAllPopupNotifications(accountId?: string): void {
  try {
    const data: ArchiveData = {
      archivedIds: [],
      archivedBefore: new Date().toISOString(),
    };
    localStorage.setItem(getKey(accountId), JSON.stringify(data));
  } catch {
    // ignore localStorage errors
  }
}

export function isPopupArchived(
  notification: { notification_id: string; created_at: string },
  accountId?: string
): boolean {
  try {
    const { archivedIds, archivedBefore } = getPopupArchiveData(accountId);
    if (archivedIds.includes(notification.notification_id)) return true;
    if (archivedBefore && new Date(notification.created_at).getTime() <= new Date(archivedBefore).getTime()) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
