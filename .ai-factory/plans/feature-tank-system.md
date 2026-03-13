# Plan: Tank System — Реализация стрельбы для разных типов танков

> **Branch:** `feature/tank-system`  
> **Created:** 2026-03-13  
> **Mode:** Full

## Settings

| Setting | Value |
|---------|-------|
| Testing | Yes |
| Logging | Verbose (DEBUG) |
| Documentation | Yes — mandatory checkpoint |
| Roadmap Milestone | Tank System |

## Roadmap Linkage

- **Milestone:** "Tank System" (ROADMAP.md)
- **Rationale:** Реализация системы стрельбы с несколькими пушками — ключевая часть milestone "Tank System"

## Research Context

Текущее состояние:
- `TankType` enum с 10 типами танков определён в `shared/src/index.ts`
- `TankDefinition` интерфейс включает `cannonCount` (кол-во пушек)
- Статистика танков (speed, fireRate, bulletSpeed, etc.) определена в `backend/src/game/entities/Tank.ts`
- **Проблема:** `cannonCount` нигде не используется! В `CombatSystem.processShooting()` всегда создаётся только 1 снаряд

Требуется реализовать:
- Множественные снаряды для танков с `cannonCount > 1`
- Разные паттерны стрельбы (TWIN — 2 передние, FLANK_GUARD — передняя + задняя, TRIPLE_SHOT — 3 веера)

---

## Tasks

### Phase 1: Расширение типов танков (TankDefinition)

#### Task 1.1: Добавить `FiringPattern` enum в shared types

- [x] **File:** `shared/src/index.ts`
- **Description:** Создать enum `FiringPattern` для определения типа стрельбы
- **Values:**
  - `SINGLE` — один центральный снаряд
  - `TWIN` — два передних снаряда
  - `FLANK` — передняя + задняя пушка (для Flank Guard)
  - `TRIPLE_SPREAD` — три снаряда веером
  - `DOUBLE_ANGLED` — два снаряда под углом (Hunter)
- **Logging:** DEBUG при добавлении нового паттерна
- **Dependencies:** None

#### Task 1.2: Добавить `firingPattern` в TankDefinition

- [x] **File:** `shared/src/index.ts`
- **Description:** Добавить поле `firingPattern: FiringPattern` в интерфейс `TankDefinition`
- **Logging:** None (type change only)
- **Dependencies:** Task 1.1

#### Task 1.3: Обновить определения танков с firingPattern

- [x] **File:** `backend/src/game/entities/Tank.ts`
- **Description:** Проставить `firingPattern` для каждого танка согласно логике:
  - BASIC, SNIPER, MACHINE_GUN, ASSASSIN, DESTROYER → SINGLE
  - TWIN → TWIN
  - FLANK_GUARD → FLANK
  - TRIPLE_SHOT → TRIPLE_SPREAD
  - HUNTER → DOUBLE_ANGLED
  - OVERSEER → SINGLE (drones — отдельная система)
- **Logging:** DEBUG при инициализации определений
- **Dependencies:** Task 1.2

---

### Phase 2: Реализация системы стрельбы в CombatSystem

#### Task 2.1: Добавить функцию calculateBulletAngles

- [x] **File:** `backend/src/game/systems/CombatSystem.ts`
- **Description:** Создать функцию, которая вычисляет углы и смещения для снарядов на основе firingPattern
- **Logic:**
  - SINGLE: возвращает [{dx: 0, dy: 0, offsetX: 0, offsetY: 0}]
  - TWIN: [{dx: -0.1, dy: 0, offsetX: -8, offsetY: 0}, {dx: 0.1, dy: 0, offsetX: 8, offsetY: 0}]
  - FLANK: [{dx: 0, dy: -1, offsetX: 0, offsetY: -15}, {dx: 0, dy: 1, offsetX: 0, offsetY: 15}] (forward + backward)
  - TRIPLE_SPREAD: [{dx: -0.15, dy: 0}, {dx: 0, dy: 0}, {dx: 0.15, dy: 0}]
  - DOUBLE_ANGLED: [{dx: -0.2, dy: 0}, {dx: 0.2, dy: 0}]
- **Returns:** Array of {relativeDx, relativeDy, offsetX, offsetY} для каждого снаряда
- **Logging:** DEBUG с паттерном при вызове
- **Dependencies:** Task 1.3

#### Task 2.2: Модифицировать processShooting для множественных снарядов

- [x] **File:** `backend/src/game/systems/CombatSystem.ts`
- **Description:** Обновить функцию processShooting для создания нескольких снарядов на основе firingPattern
- **Changes:**
  - Получить firingPattern из getTankDefinition
  - Вызвать calculateBulletAngles для получения массива углов/смещений
  - Для каждого bulletParams создать снаряд с соответствующим вектором скорости
  - Использовать offsetX/offsetY для позиции спавна относительно центра танка
- **Logging:** DEBUG с количеством созданных снарядов, bulletId каждого
- **Dependencies:** Task 2.1, Task 1.3
- **Tests:** Должен быть покрыт тестами

---

### Phase 3: Тестирование

#### Task 3.1: Написать тесты для calculateBulletAngles

- [x] **File:** `backend/src/game/systems/CombatSystem.test.ts` (или создать новый)
- **Description:** Тесты для функции calculateBulletAngles
- **Test cases:**
  - SINGLE возвращает 1 элемент с центральным вектором
  - TWIN возвращает 2 элемента с разными offsetX
  - FLANK возвращает 2 элемента с противоположными dy
  - TRIPLE_SPREAD возвращает 3 элемента с разными углами
  - DOUBLE_ANGLED возвращает 2 элемента
- **Logging:** None (test file)
- **Dependencies:** Task 2.1

#### Task 3.2: Написать интеграционные тесты для processShooting

- [x] **File:** `backend/src/game/systems/CombatSystem.test.ts`
- **Description:** Тесты проверяющие что разные танки создают правильное количество снарядов
- **Test cases:**
  - BASIC (SINGLE) создаёт 1 снаряд
  - TWIN создаёт 2 снаряда
  - TRIPLE_SHOT создаёт 3 снаряда
  - FLANK_GUARD создаёт 2 снаряда в противоположных направлениях
- **Logging:** None (test file)
- **Dependencies:** Task 2.2

---

### Phase 4: Коммит и документация

#### Task 4.1: Коммит промежуточных результатов

- **Scope:** Tasks 1.1-1.3 завершены
- **Message:** `feat(game): add FiringPattern enum and tank definitions`

#### Task 4.2: Коммит основной функциональности

- **Scope:** Tasks 2.1-2.2 завершены  
- **Message:** `feat(game): implement multi-cannon firing patterns in CombatSystem`

#### Task 4.3: Коммит тестов

- **Scope:** Tasks 3.1-3.2 завершены
- **Message:** `test(game): add tests for multi-cannon firing patterns`

#### Task 4.4: Документация — обязательный чекпоинт

- [x] **Description:** Создать/обновить документацию по системе танков
- **Files to update:**
  - `docs/architecture.md` — добавить секцию о firing patterns
  - Или создать `docs/tank-system.md` если его нет
- **Logging:** INFO при создании документации
- **Dependencies:** All tasks complete

---

## Commit Plan

| # | Tasks | Commit Message |
|---|-------|----------------|
| 1 | Task 1.1-1.3 | `feat(game): add FiringPattern enum and tank definitions` |
| 2 | Task 2.1-2.2 | `feat(game): implement multi-cannon firing patterns in CombatSystem` |
| 3 | Task 3.1-3.2 | `test(game): add tests for multi-cannon firing patterns` |
| 4 | Task 4.4 (docs) | `docs: add tank firing patterns documentation` |

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
