// Service Worker para Web Push Notifications - MultiFLOW
const CACHE_NAME = "multiflow-v2";

self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker ativado");
  event.waitUntil(self.clients.claim());
});

const notifyAllClients = async (message) => {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clientList) {
    try {
      client.postMessage(message);
    } catch (error) {
      console.error("[SW] Erro ao enviar postMessage para client:", error);
    }
  }
};

self.addEventListener("push", (event) => {
  console.log("[SW] Push recebido:", event);

  let data = {
    title: "MultiFLOW",
    body: "Nova mensagem recebida",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    tag: "default",
    url: "/",
    ticketId: null,
    ticketUuid: null
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error("[SW] Erro ao parsear dados do push:", e);
    try {
      if (event.data) {
        data.body = event.data.text();
      }
    } catch (_) {}
  }

  const options = {
    body: data.body,
    icon: data.icon || "/android-chrome-192x192.png",
    badge: data.badge || "/favicon-32x32.png",
    tag: data.tag || "default",
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      ticketId: data.ticketId || null,
      ticketUuid: data.ticketUuid || null
    },
    actions: [
      { action: "open", title: "Abrir" },
      { action: "close", title: "Fechar" }
    ]
  };

  event.waitUntil(
    (async () => {
      await notifyAllClients({
        type: "PUSH_NEW_MESSAGE",
        payload: {
          title: data.title,
          body: data.body,
          icon: data.icon || "/android-chrome-192x192.png",
          badge: data.badge || "/favicon-32x32.png",
          tag: data.tag || "default",
          url: data.url || "/",
          ticketId: data.ticketId || null,
          ticketUuid: data.ticketUuid || null
        }
      });

      await self.registration.showNotification(data.title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notificação clicada:", event.notification.tag);
  event.notification.close();

  if (event.action === "close") return;

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clientList) {
        try {
          await client.focus();

          client.postMessage({
            type: "PUSH_NOTIFICATION_CLICKED",
            payload: {
              url: urlToOpen,
              ticketId: notificationData.ticketId || null,
              ticketUuid: notificationData.ticketUuid || null
            }
          });

          if ("navigate" in client && urlToOpen) {
            await client.navigate(urlToOpen);
          }

          return;
        } catch (error) {
          console.error("[SW] Erro ao focar/navegar client:", error);
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notificação fechada");
});