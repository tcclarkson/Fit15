// Fit 15 service worker — receives push notifications and handles taps.

self.addEventListener("push", (event) => {
  let data = { title: "Fit 15 🔥", body: "Time to move!", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_e) {
    // keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if the app is already open, else open a new one.
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
