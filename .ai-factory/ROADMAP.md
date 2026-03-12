# Project Roadmap

> Real-time multiplayer browser IO game with tank evolution system, inspired by diep.io and arras.io

## Milestones

- [x] **Monorepo Setup** — TypeScript монорепо с `backend/`, `frontend/`, `shared/` пакетами и общими конфигами
- [x] **Backend Foundation** — Fastify HTTP сервер, структура проекта, pino логи, обработка ошибок
- [x] **Database & Auth** — Prisma схема, PostgreSQL, регистрация и вход игроков, JWT токены
- [x] **WebSocket Game Server** — uWebSockets.js, менеджер комнат (80 игроков), бинарный протокол, auto-scaling
- [x] **Core Game Engine** — фиксированный tick loop (20 TPS), физика движения, коллизии, границы карты, система снарядов
- [ ] **Tank System** — несколько типов танков с уникальными снарядами, характеристиками и балансом
- [ ] **XP & Leveling** — начисление опыта за убийства, пороги уровней, событие level-up
- [ ] **Tank Evolution System** — дерево эволюций, выбор эволюции при повышении уровня (как в arras.io)
- [ ] **Frontend Foundation** — Next.js приложение, страница лобби, WebSocket клиент, подключение к комнате
- [ ] **Game Canvas Rendering** — Pixi.js рендеринг: танки, снаряды, карта, следование камеры за игроком
- [ ] **Game HUD & UI** — полоса здоровья, XP-бар, оверлей таблицы лидеров, экран выбора эволюции
- [ ] **Persistent Stats & Leaderboard** — трекинг убийств, лучший счёт, API топ-игроков, история матчей
- [ ] **Anti-Cheat & Security** — server-side валидация инпутов, rate limiting на API, защита от speedhack
- [ ] **Production Deployment** — Docker, CI/CD pipeline, production-окружение, мониторинг

## Completed

| Milestone | Date |
|-----------|------|
| Monorepo Setup | 2026-03-12 |
| Backend Foundation | 2026-03-12 |
| Database & Auth | 2026-03-12 |
| WebSocket Game Server | 2026-03-12 |
| Core Game Engine | 2026-03-13 |
