import { api } from "./api";

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// The current minute-of-day the app's timezone thinks it is, so the server can
// convert the user's chosen local time back to a moment.
export function tzOffsetMinutes(): number {
  // getTimezoneOffset is minutes behind UTC (positive west). We store the offset
  // to ADD to UTC to get local, so negate it.
  return -new Date().getTimezoneOffset();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await getRegistration();
  return reg.pushManager.getSubscription();
}

// Ask permission, subscribe to push, and register the reminder time (minutes
// past local midnight). Returns true on success. Throws with a message on denial.
export async function enableReminders(reminderMinutes: number): Promise<void> {
  if (!pushSupported()) throw new Error("Notifications aren't supported on this device/browser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked. Enable them for this app in your browser settings.");
  }

  const { publicKey } = await api.get<{ publicKey: string }>("/push/vapid-public-key");
  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  await api.post("/push/subscribe", {
    subscription: sub.toJSON(),
    reminderMinutes,
    tzOffsetMinutes: tzOffsetMinutes(),
  });
}

export async function updateReminderTime(reminderMinutes: number): Promise<void> {
  await api.post("/push/reminder", { reminderMinutes, tzOffsetMinutes: tzOffsetMinutes() });
}

export async function disableReminders(): Promise<void> {
  const sub = await getExistingSubscription();
  await api.post("/push/unsubscribe", { endpoint: sub?.endpoint });
  if (sub) await sub.unsubscribe().catch(() => {});
}
