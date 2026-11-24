// 앱 화면(껍데기)만 캐시합니다. Supabase 데이터 요청은 항상 네트워크로 보냅니다.
const CACHE = 'yeongsan-v3';

// 알림을 누르면 앱 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return clients.openWindow('./index.html');
    })
  );
});
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase(API, 실시간) 및 외부 도메인은 건드리지 않음
  if (url.origin !== location.origin) return;

  // 페이지: 네트워크 우선, 실패(오프라인) 시 캐시 → 항상 최신 index.html 사용
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { caches.open(CACHE).then(c => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 아이콘 등 정적 파일: 캐시 우선
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
