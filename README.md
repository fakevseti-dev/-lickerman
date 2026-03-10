# Trust Tap — Next.js (фронт + бек в одном проекте)

## Запуск

```bash
# 1. Установить зависимости
npm install

# 2. Создать файл окружения
cp .env.local.example .env.local
# Открыть .env.local и заполнить все переменные

# 3. Запустить в режиме разработки
npm run dev
# → http://localhost:3000        — игра
# → http://localhost:3000/admin  — админка (пароль = ADMIN_KEY из .env.local)
```

## Деплой на Railway (рекомендую)

1. Залить проект на GitHub
2. Зайти на railway.app → New Project → Deploy from GitHub
3. Добавить переменные из `.env.local` в разделе Variables
4. Railway сам запустит `npm run build && npm start`

## Структура

```
src/
├── app/
│   ├── page.tsx              ← главная страница (игра)
│   ├── admin/page.tsx        ← админка /admin
│   └── api/
│       ├── init/route.ts     ← POST /api/init
│       ├── sync/route.ts     ← POST /api/sync
│       ├── referrals/route.ts← GET  /api/referrals?id=...
│       ├── tasks/route.ts    ← POST /api/tasks
│       └── admin/route.ts    ← GET/POST /api/admin
├── components/
│   ├── GameClient.tsx        ← весь UI игры
│   ├── AdminClient.tsx       ← весь UI админки
│   └── useGame.ts            ← игровая логика
├── lib/
│   ├── db.ts                 ← MongoDB подключение
│   └── api.ts                ← хелперы, rate limit
├── models/User.ts            ← схема пользователя
└── types/index.ts            ← константы экономики
```

## Важно

- Оригинальный пароль `0001k` заменён на `ADMIN_KEY` из переменных окружения
- Ключ передаётся в заголовке `x-admin-key` (не в теле запроса — безопаснее)
- Все API эндпоинты имеют rate limiting
- MongoDB схема — точная копия оригинального server.js
