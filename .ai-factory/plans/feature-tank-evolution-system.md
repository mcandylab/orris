# Plan: Tank Evolution System

**Branch:** `feature/tank-evolution-system`
**Date Created:** 2026-03-13
**Status:** In Planning

## Overview

Система эволюции танков **уже реализована** на бэкенде и фронтенде (протокол, выбор эволюции, валидация). Этот план фокусируется на:
- **Документирование** полной архитектуры эволюции для команды
- **Завершение UI** — отображение типа танка на HUD
- **Тестирование** — покрытие frontend компонентов
- **Улучшение UX** — предпросмотр статов при выборе эволюции
- **Итоговая интеграция** — разметка milestone как завершённого

## Settings

- **Testing:** Yes — юнит-тесты для UI компонентов
- **Logging:** Verbose (DEBUG + INFO) — отслеживание смены танков и состояния модали
- **Docs:** Yes — обязательна документация после реализации
- **Roadmap Linkage:** Yes

## Roadmap Linkage

**Milestone:** Tank Evolution System
**Rationale:** Это завершающий milestone для системы эволюции — фиксим UI, добавляем документацию, тесты и интеграцию.

## Tasks

### Phase 1: Documentation & Analysis (Task #1)

**✅ Task 1.1 — Документация: система эволюции танков**
- Файл: `.ai-factory/docs/EVOLUTION_SYSTEM.md`
- Секции:
  1. Обзор (дерево эволюций, 3 уровня: 3, 6, 9)
  2. Архитектура бэкенда (XpSystem, Tank.ts, GameLoop интеграция)
  3. Архитектура фронтенда (GameClient, EvolutionModal, GameState)
  4. WebSocket протокол (ClientOp.CHOOSE_EVOLUTION, ServerOp.LEVEL_UP)
  5. TankDefinition структура (stats, evolvesTo, evolvesFrom)
  6. Примеры flow (kill → level-up → выбор эволюции)
  7. Файлы для быстрого поиска и запуска
- Логирование: INFO при создании документа, DEBUG при каждом разделе

**Estimate:** 1-2 часа

---

### Phase 2: UI Enhancements (Tasks #2, #4)

**✅ Task 2.1 — UI: отображение типа танка на HUD**
- Файл: `/frontend/components/GameHUD.tsx`
- Требования:
  - Добавить компонент-секцию "Текущий танк: {TANK_NAME}"
  - Использовать `TANK_NAMES` mapping для отображения
  - Обновляться при смене tankType в snapshot
  - Размещение: рядом с XpBar или в отдельной строке (max-width: 300px, выравнивание по центру)
  - Логирование: DEBUG при смене типа танка
- Опционально: создать отдельный компонент `TankNameDisplay.tsx` если нужна переиспользуемость

**✅ Task 4.1 — UI: предпросмотр статов танка в EvolutionModal**
- Файл: `/frontend/components/EvolutionModal.tsx`
- Требования:
  - При наведении на вариант эволюции показать popup/tooltip с дельта-статами
  - Формат: `HP: 100 → 150 (+50)`, красный/зелёный цвет для дельты
  - Показываемые статы: maxHealth, speed, fireRate, bulletDamage
  - Использовать TANK_DEFINITIONS для получения статов
  - Логирование: DEBUG при расчёте дельты
- Опционально: helper функция в GameState для `getStatsDelta(tankFrom, tankTo)`

**Estimate:** 2-3 часа (оба UI таска вместе)

---

### Phase 3: Testing (Task #3)

**✅ Task 3.1 — Тесты: EvolutionModal**
- Файл: `/frontend/components/EvolutionModal.test.tsx`
- Тесты:
  1. Отображение кнопок для каждого варианта эволюции (используя mock `choices`)
  2. Таймер обратного отсчёта: проверить, что таймер работает корректно на 15 сек
  3. Auto-select при истечении времени: проверить вызов `onSelect` с первым вариантом
  4. Вызов `onSelect` при клике на кнопку
  5. Скрытие модали после выбора (если логика управляется родителем)
- Логирование: DEBUG при инициализации, INFO при успехе каждого теста
- Mock data: создать тестовый набор choices (2-4 варианта TankType)

**✅ Task 3.2 — Тесты: XpBar**
- Файл: `/frontend/components/XpBar.test.tsx`
- Тесты:
  1. Отображение текущего уровня (playerLevel = 1, 5, 10)
  2. Корректный расчёт прогресса (%) для разных уровней
  3. Обновление при изменении playerLevel
  4. Граничные случаи: уровень 1 (0% прогресс), уровень 10 (100% или логика)
  5. Отображение текста прогресса

**Estimate:** 2-3 часа

---

### Phase 4: Integration & Finalization (Task #5)

**✅ Task 5.1 — Обновление ROADMAP.md**
- Файл: `.ai-factory/ROADMAP.md`
- Изменения:
  - Отметить `[x] Tank Evolution System` (уже должно быть галочкой после реализации)
  - Добавить дату 2026-03-13 в таблицу Completed
  - Проверить логику: эволюция готова (backend + frontend), далее идут Frontend Foundation и Canvas Rendering

**Estimate:** 15 минут

---

## Commit Plan

5 задач → 2 коммита по логике:

**Commit 1: Docs & UI**
- Task #1 (документация)
- Task #2 (отображение танка)
- Task #4 (предпросмотр статов)

```
feat(docs, ui): add evolution system documentation and tank type display

- Add comprehensive EVOLUTION_SYSTEM.md with architecture and examples
- Display current tank type on HUD
- Add stats preview in evolution modal selection
```

**Commit 2: Tests & Integration**
- Task #3 (тесты EvolutionModal, XpBar)
- Task #5 (обновление ROADMAP)

```
test(ui, integration): add evolution modal tests and finalize milestone

- Add EvolutionModal unit tests (rendering, timer, auto-select)
- Add XpBar unit tests (level display, progress calculation)
- Mark Tank Evolution System milestone as complete in ROADMAP
```

---

## Testing Strategy

### Backend
- ✅ Существующие тесты: `XpSystem.test.ts` (award, level-up, evolution choices)
- ✅ Существующие тесты: `CombatSystem.test.ts` (tank stats, firing patterns)
- ℹ️ Не требуются новые тесты (бэкенд стабилен)

### Frontend
- 🆕 `EvolutionModal.test.tsx` — новые тесты (coverage: UI, timer, callback)
- 🆕 `XpBar.test.tsx` — новые тесты (coverage: level display, progress)
- 📝 Используем Vitest + React Testing Library (как в проекте)

### Integration
- Ручное тестирование full flow: kill → level-up → выбор эволюции → обновление танка на HUD

---

## Logging Requirements

### Backend (if any changes)
- Tank.ts: DEBUG при эволюции (старый → новый тип)
- XpSystem.ts: DEBUG при создании LevelUpEvent с evolutionChoices

### Frontend
- GameHUD.tsx: DEBUG при обновлении tankType из snapshot
- EvolutionModal.tsx: DEBUG при расчёте дельты статов
- Test files: DEBUG при инициализации, INFO при успехе

**Log format:** Используем pino для бэкенда (уже есть), консоль для фронтенда (временно для разработки).

---

## Dependencies

- Task #1 (docs) — независима, может быть параллельно
- Task #2 (tank display) — зависит от Task #1 (для понимания архитектуры)
- Task #4 (stats preview) — зависит от Task #2 (использует тот же компонент)
- Task #3 (тесты) — зависит от Task #2 и #4 (тестируем готовый код)
- Task #5 (ROADMAP) — может быть в конце (независима, но последний шаг)

**Optimal order:**
1. Task #1 (docs) — базовое понимание
2. Task #2 → Task #4 (UI вместе)
3. Task #3 (тесты готового кода)
4. Task #5 (финализация)

---

## File Changes Summary

### New Files
- `.ai-factory/docs/EVOLUTION_SYSTEM.md` — документация

### Modified Files
- `/frontend/components/GameHUD.tsx` — добавить отображение танка
- `/frontend/components/EvolutionModal.tsx` — добавить предпросмотр статов
- `/frontend/components/EvolutionModal.test.tsx` — новые тесты
- `/frontend/components/XpBar.test.tsx` — новые тесты
- `.ai-factory/ROADMAP.md` — отметить milestone как завершённый
- `/frontend/game/GameState.ts` — опционально, helper функция для статов

### No Changes Needed
- Backend логика (всё готово)
- WebSocket протокол (всё готово)
- Tank definitions (всё готово)

---

## Success Criteria

✅ **Documentation**
- Все разделы документированы и читаемы
- Примеры flow и кода присутствуют

✅ **UI**
- Текущий тип танка отображается на HUD и обновляется
- Модаль показывает дельта-статы при выборе эволюции

✅ **Testing**
- EvolutionModal: все 5 тестов проходят
- XpBar: все 5 тестов проходят
- Coverage: min 80% для обоих компонентов

✅ **Integration**
- ROADMAP отмечен как завершённый
- Все коммиты следуют conventional commits
- Логирование работает как ожидается

---

## Next Steps After Implementation

После завершения этого плана:
1. **Frontend Foundation** — Next.js лобби, подключение к серверу
2. **Canvas Rendering** — Pixi.js визуализация танков с эволюцией
3. **Persistent Stats** — сохранение статистики матчей в БД

---

## Notes

- Система эволюции полностью функциональна (backend + protocol + frontend skeleton)
- Этот план фокусируется на UX, документации и тестировании
- Canvas рендеринг танков — отдельный план (Frontend Foundation / Canvas Rendering)
- Все инструменты уже в проекте: Vitest, React Testing Library, pino логи
