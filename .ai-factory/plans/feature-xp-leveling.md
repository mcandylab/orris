# Plan: XP & Leveling System

> **Branch:** `feature/xp-leveling`  
> **Created:** 2026-03-13  
> **Mode:** Full

## Settings

| Setting | Value |
|---------|-------|
| Testing | Yes |
| Logging | Verbose (DEBUG) |
| Documentation | Yes — mandatory checkpoint |
| Roadmap Milestone | XP & Leveling |

## Roadmap Linkage

- **Milestone:** "XP & Leveling" (ROADMAP.md)
- **Rationale:** Реализация системы XP и уровней — следующий milestone после Tank System

## Research Context

Текущее состояние (backend):
- `XpSystem.ts` — полностью реализована логика XP и level-up
- `awardKillXp()` — начисление XP за убийства (BASE_KILL_XP = 50 + score жертвы)
- `checkLevelUp()` — проверка порогов XP, mult-level jumps, генерация evolution choices
- `GameLoop` интегрирован с XpSystem
- `encoder.ts` кодирует LEVEL_UP message для клиента
- `onOpen.ts` обрабатывает level-up и отправляет клиенту

Текущее состояние (shared):
- `XP_THRESHOLDS` — массив порогов XP для каждого уровня
- `MAX_LEVEL` = 10
- `EVOLUTION_LEVELS` = [3, 6, 9]

Что может требовать доработки:
1. Тесты для XpSystem (уже есть, но можно расширить)
2. Frontend: отображение XP бара
3. Frontend: уведомление о level-up
4. Frontend: UI выбора эволюции

---

## Tasks

### Phase 1: Расширение тестов XpSystem

#### Task 1.1: Добавить тесты для awardKillXp

- [x] **File:** `backend/src/game/systems/XpSystem.test.ts`
- **Description:** Расширить тесты для функции awardKillXp
- **Test cases:**
  - Базовая награда (BASE_KILL_XP)
  - Бонус за score жертвы
  - Ограничение MAX_LEVEL
- **Dependencies:** None

#### Task 1.2: Добавить edge case тесты для checkLevelUp

- [x] **File:** `backend/src/game/systems/XpSystem.test.ts`
- **Description:** Добавить edge cases для checkLevelUp
- **Test cases:**
  - MAX_LEVEL нельзя превысить
  - empty evolutionChoices на не-эволюционных уровнях
- **Dependencies:** Task 1.1

---

### Phase 2: Frontend — XP Bar и Level Display

#### Task 2.1: Добавить XP state в frontend game state

- [x] **File:** `frontend/game/GameState.ts` (created)
- **Description:** Добавить отслеживание XP и level в клиентском state
- **Fields:**
  - currentLevel: number
  - currentXp: number
  - xpToNextLevel: number (вычисляемое)
- **Dependencies:** None

#### Task 2.2: Создать компонент XP Bar

- [x] **File:** `frontend/components/XpBar.tsx` (created)
- **Description:** React компонент для отображения XP прогресс бара
- **Features:**
  - Текущий XP / порог для следующего уровня
  - Анимация при gain XP
  - Level indicator
- **Dependencies:** Task 2.1

#### Task 2.3: Интегрировать XP Bar в HUD

- [x] **File:** `frontend/components/GameHUD.tsx` (created)
- **Description:** Добавить XP Bar в игровой HUD
- **Dependencies:** Task 2.2

---

### Phase 3: Frontend — Level-up и Evolution UI

#### Task 3.1: Обработка LEVEL_UP события на клиенте

- [x] **File:** `frontend/game/GameClient.ts` (created)
- **Description:** Декодировать LEVEL_UP message и обновить state
- **Logic:**
  - Получить newLevel и evolutionChoices
  - Обновить currentLevel
  - Если есть choices — показать evolution modal
- **Logging:** DEBUG при получении LEVEL_UP
- **Dependencies:** Task 2.1

#### Task 3.2: Создать Evolution Selection Modal

- [x] **File:** `frontend/components/EvolutionModal.tsx` (created)
- **Description:** UI для выбора эволюции танка
- **Features:**
  - Показать доступные эволюции (из choices)
  - Отобразить превью танка/статы
  - Подтверждение выбора → отправить CHOOSE_EVOLUTION
  - Таймер обратного отсчёта
- **Dependencies:** Task 3.1

#### Task 3.3: Отправить CHOOSE_EVOLUTION на сервер

- [x] **File:** `frontend/game/GameClient.ts`
- **Description:** Реализовать отправку выбора эволюции
- **Logic:**
  - Кодировать ClientOp.CHOOSE_EVOLUTION + tankType
  - Отправить через WebSocket
- **Logging:** DEBUG при отправке
- **Dependencies:** Task 3.2

---

### Phase 4: Коммит и документация

#### Task 4.1: Коммит тестов

- **Scope:** Tasks 1.1-1.2 завершены
- **Message:** `test(game): expand XpSystem tests`

#### Task 4.2: Коммит frontend XP/Level

- **Scope:** Tasks 2.1-2.3 завершены
- **Message:** `feat(frontend): add XP bar and level display to HUD`

#### Task 4.3: Коммит Evolution UI

- **Scope:** Tasks 3.1-3.3 завершены
- **Message:** `feat(frontend): add evolution selection modal`

#### Task 4.4: Документация

- [x] **Description:** Обновить документацию
- **Files:** `docs/architecture.md` — добавлена секция об XP & Leveling
- **Dependencies:** All tasks complete

---

## Commit Plan

| # | Tasks | Commit Message |
|---|-------|----------------|
| 1 | Task 1.1-1.2 | `test(game): expand XpSystem tests` |
| 2 | Task 2.1-2.3 | `feat(frontend): add XP bar and level display to HUD` |
| 3 | Task 3.1-3.3 | `feat(frontend): add evolution selection modal` |
| 4 | Task 4.4 | `docs: add XP & Leveling documentation` |

---

## Next Steps

План создан с 11 задачами.

Для начала реализации:
```
/aif-implement
```

Для просмотра задач:
```
/tasks
```
