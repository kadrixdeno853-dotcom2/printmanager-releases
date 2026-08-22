export type ActivityNotice = {
  id: string;
  title: string;
  detail: string;
  page: string;
  tone: "warning" | "danger" | "info";
  createdAt: string;
};

const storageKey = "printmanager.recent-notifications";

export function recentActivities(): ActivityNotice[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]") as ActivityNotice[];
  } catch {
    return [];
  }
}

export function notifyActivity(notice: Omit<ActivityNotice, "id" | "createdAt"> & { id?: string }) {
  const activity: ActivityNotice = {
    ...notice,
    id: notice.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  const recent = [activity, ...recentActivities().filter(item => item.id !== activity.id)];
  localStorage.setItem(storageKey, JSON.stringify(recent));
  window.dispatchEvent(new CustomEvent("printmanager:data-changed", { detail: activity }));
  return activity;
}
