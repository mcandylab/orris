# Tank Evolution System — Архитектура и реализация

**Версия:** 1.0
**Дата:** 2026-03-13
**Статус:** Реализована, документирована

---

## Обзор

Система эволюции танков позволяет игрокам выбирать путь развития своего танка при достижении определённых уровней. Каждый танк может эволюционировать в один из нескольких вариантов, формируя **дерево эволюций**, похожее на систему в arras.io.

### Ключевые характеристики

- **3 уровня эволюции:** уровни 3, 6 и 9
- **10 типов танков:** BASIC (стартовый) → 4 варианта уровня 2 → 5 вариантов уровня 3
- **Server-authoritative:** сервер валидирует все выборы эволюции
- **Real-time синхронизация:** выбор эволюции отправляется через бинарный WebSocket протокол

---

## Дерево эволюций

```
┌─────────────────────────────────────────────────────────────┐
│                    BASIC (Level 1)                          │
│        Стартовый танк: 1 пушка, средняя статистика        │
└────────┬────────────────────────────────────────────────────┘
         │
    Выбор на уровне 3
         │
   ┌─────┼─────┬──────────┬────────────┐
   │     │     │          │            │
   ▼     ▼     ▼          ▼            ▼
 TWIN  SNIPER MACHINE_GUN FLANK_GUARD (Level 2)
  │      │       │          │
  │   ┌──┴──┐    │          │
  │   │  │  │    │          │
  ▼   ▼  ▼  ▼    ▼          ▼
TRI  ASS HUN DES OVE        (Level 3)
```

### Статистика танков

| Танк | Уровень | Здоровье | Скорость | ОПМ | Урон | Особенность |
|------|---------|----------|----------|-----|------|-------------|
| **BASIC** | 1 | 100 | 200 | 1.67 | 20 | Стартовый танк |
| **TWIN** | 2 | 110 | 190 | 2.50 | 15 | 2 пушки спереди |
| **SNIPER** | 2 | 90 | 180 | 0.83 | 50 | Редкая, дальнобойная |
| **MACHINE_GUN** | 2 | 100 | 195 | 6.67 | 8 | Быстрая стрельба |
| **FLANK_GUARD** | 2 | 110 | 200 | 1.67 | 18 | Передняя + задняя пушка |
| **TRIPLE_SHOT** | 3 | 120 | 185 | 2.00 | 14 | 3 пули в разброс |
| **ASSASSIN** | 3 | 80 | 220 | 0.83 | 75 | Скоростной дальнобойный |
| **HUNTER** | 3 | 95 | 210 | 2.00 | 30 | 2 пули под углом |
| **DESTROYER** | 3 | 130 | 175 | 1.67 | 25 | Самый тяжёлый |
| **OVERSEER** | 3 | 115 | 195 | 1.67 | 20 | Боевой танк |

### XP Пороги

| Уровень | XP Требуется | До следующего | Эволюция? |
|---------|-------------|---------------|----------|
| 1 | 0 | 100 | — |
| 2 | 100 | 150 | — |
| **3** | 250 | 250 | ✅ **ПЕРВАЯ** |
| 4 | 500 | 400 | — |
| 5 | 900 | 600 | — |
| **6** | 1500 | 1000 | ✅ **ВТОРАЯ** |
| 7 | 2500 | 1500 | — |
| 8 | 4000 | 2000 | — |
| **9** | 6000 | 3000 | ✅ **ТРЕТЬЯ** |
| 10 | 9000 | ∞ | — |

---

## Архитектура: Backend

### XpSystem (`backend/src/game/systems/XpSystem.ts`)

Система начисления опыта и проверки повышения уровня.

#### Функция `awardKillXp(killer, victim)`

```typescript
function awardKillXp(killer: Player, victim: Player): number
```

**Логика:**
- **Базовая награда:** 50 XP
- **Бонус за score жертвы:** +score
- Всего: `50 + victim.score`

**Пример:**
```
Убийца получает за жертву с score 100:
XP = 50 + 100 = 150 XP
```

#### Функция `checkLevelUp(player, logger)`

```typescript
function checkLevelUp(player: Player, logger: Logger): LevelUpEvent | null
```

**Логика:**
1. Проверяет в loop, достаточно ли XP до следующего уровня
2. Поднимает уровень, если `player.score >= XP_THRESHOLDS[level + 1]`
3. Поддерживает multi-level jumps (огромный kill → несколько уровней сразу)
4. Останавливается на MAX_LEVEL (10)
5. Если уровень входит в `EVOLUTION_LEVELS = [3, 6, 9]`:
   - Получает массив `evolvesTo` текущего танка
   - Возвращает `LevelUpEvent` с `evolutionChoices`
6. Иначе: пустой массив `evolutionChoices = []`

**Возвращаемый тип:**
```typescript
interface LevelUpEvent {
  playerId: number;
  newLevel: number;
  evolutionChoices: TankType[]; // Пусто если не эволюционный уровень
}
```

**Логирование:**
```json
{ "event": "level_up", "playerId": 1, "newLevel": 3, "xp": 250 }
```

### Tank.ts (`backend/src/game/entities/Tank.ts`)

Определения всех танков с их статистикой и путями эволюции.

#### Структура TankDefinition

```typescript
interface TankDefinition {
  type: TankType;                      // BASIC, TWIN, SNIPER, ...
  name: string;                        // "Basic", "Twin", ...
  maxHealth: number;                   // 80-130
  speed: number;                       // pixels/sec, 175-220
  radius: number;                      // collision radius
  cannonCount: number;                 // 1-3
  fireRate: number;                    // ms между выстрелами
  bulletSpeed: number;                 // pixels/sec
  bulletDamage: number;                // 8-75
  bulletLifetime: number;              // seconds

  evolvesFrom: TankType | null;        // Предыдущий танк (null для BASIC)
  evolvesTo: TankType[];               // Доступные эволюции ([] для финальных)
  firingPattern: FiringPattern;        // SINGLE, TWIN, FLANK, TRIPLE_SPREAD
}
```

#### Пример определения

```typescript
[TankType.BASIC]: {
  type: TankType.BASIC,
  name: 'Basic',
  maxHealth: 100,
  speed: 200,
  radius: 20,
  cannonCount: 1,
  fireRate: 600,          // 1 выстрел в 600ms = 1.67 выстрелов/сек
  bulletSpeed: 400,
  bulletDamage: 20,
  bulletLifetime: 2,
  evolvesFrom: null,      // Стартовый танк
  evolvesTo: [TankType.TWIN, TankType.SNIPER, TankType.MACHINE_GUN, TankType.FLANK_GUARD],
  firingPattern: FiringPattern.SINGLE,
}
```

### GameLoop интеграция (`backend/src/game/engine/GameLoop.ts`)

Главный игровой цикл (20 TPS) вызывает систему эволюции после каждого убийства.

**Flow на сервере:**

```
1. Обнаружено убийство → killEvent
2. awardKillXp(killer, victim)
3. checkLevelUp(killer) → возвращает LevelUpEvent (может быть null)
4. Если LevelUpEvent не null:
   - onPlayerLevelUp() callback
   - Кодирует LEVEL_UP сообщение
   - Отправляет клиенту через WebSocket
```

**Код:**
```typescript
const levelUpEvent = checkLevelUp(player, logger);
if (levelUpEvent) {
  this.onPlayerLevelUp?.(levelUpEvent);
}
```

### Обработка выбора эволюции (`backend/src/ws/handlers/onMessage.ts`)

Получение ClientOp.CHOOSE_EVOLUTION от клиента и обновление танка.

**Flow:**

```
1. Клиент отправляет: [op: 0x04] [tankType: u8]
2. Сервер парсит, получает chosenTankType
3. Валидация:
   - Проверяет, что chosenTankType в player.tankType.evolvesTo
   - Если валидна → обновляет player.tankType
   - Масштабирует maxHealth пропорционально:
     health = (health / oldMax) * newMax
4. Отправляет новый snapshot со сцены (с новым tankType и новым maxHealth)
5. Скрывает модаль эволюции на клиенте
```

**Валидация код:**
```typescript
const newTankDef = getTankDefinition(chosenTankType);
const oldTankDef = getTankDefinition(player.tankType);

if (!oldTankDef.evolvesTo.includes(chosenTankType)) {
  // Неправильный выбор — игнорировать
  return;
}

// Масштабировать здоровье
const healthRatio = player.health / player.maxHealth;
player.health = Math.ceil(healthRatio * newTankDef.maxHealth);
player.maxHealth = newTankDef.maxHealth;
player.tankType = chosenTankType;
```

---

## Архитектура: Frontend

### GameClient (`frontend/game/GameClient.ts`)

WebSocket клиент, управляющий коммуникацией с сервером.

#### Отправка выбора эволюции

```typescript
sendEvolutionChoice(tankType: TankType): void {
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint8(0, ClientOp.CHOOSE_EVOLUTION);  // 0x04
  view.setUint8(1, tankType);                   // TankType

  this.ws.send(buffer);

  this.state.showEvolutionModal = false;  // Закрыть модаль
  this.notifyStateChange();

  console.debug('DEBUG [GameClient] CHOOSE_EVOLUTION sent', tankType);
}
```

#### Получение LEVEL_UP

```typescript
handleMessage(data: Uint8Array): void {
  const op = data[0];

  if (op === ServerOp.LEVEL_UP) {
    const newLevel = data[1];
    const choiceCount = data[2];
    const choices: TankType[] = [];
    for (let i = 0; i < choiceCount; i++) {
      choices.push(data[3 + i]);
    }

    this.state.playerLevel = newLevel;
    this.state.evolutionChoices = choices;
    this.state.showEvolutionModal = choiceCount > 0;

    this.levelUpListeners.forEach(l => l(newLevel, choices));
    this.notifyStateChange();
  }
}
```

#### Слушатели

```typescript
// Подписка на level-up событие
client.onLevelUp((level, choices) => {
  console.log(`Достигнут уровень ${level}, доступные эволюции:`, choices);
});

// Подписка на изменение состояния
client.onStateChange((state) => {
  // Обновить UI
});
```

### GameState (`frontend/game/GameState.ts`)

Локальное состояние игры на клиенте.

```typescript
interface GameState {
  // ...
  playerLevel: number;                  // Текущий уровень (1-10)
  showEvolutionModal: boolean;          // Показать ли модаль выбора
  evolutionChoices: TankType[];         // Доступные эволюции
  players: Map<number, PlayerState>;    // Все игроки, включая себя
}
```

**Helper функции:**

```typescript
// Получить прогресс до следующего уровня (0-100%)
getXpProgress(playerScore: number): number {
  const currentThreshold = XP_THRESHOLDS[playerLevel];
  const nextThreshold = XP_THRESHOLDS[playerLevel + 1];
  const progress = (playerScore - currentThreshold) /
                   (nextThreshold - currentThreshold);
  return Math.max(0, Math.min(100, progress * 100));
}

// Получить XP до следующего уровня
getXpToNextLevel(playerScore: number): number {
  return XP_THRESHOLDS[playerLevel + 1] - playerScore;
}
```

### EvolutionModal (`frontend/components/EvolutionModal.tsx`)

Модальное окно выбора эволюции.

**Props:**
```typescript
interface EvolutionModalProps {
  choices: TankType[];                  // Доступные варианты
  onSelect: (tankType: TankType) => void;  // Callback выбора
  tankNames: Record<TankType, string>;  // Имена танков для отображения
}
```

**Функциональность:**
- Таймер обратного отсчёта 15 секунд
- При клике на вариант: вызывает `onSelect(tankType)`
- При истечении времени: автоматический выбор первого варианта
- Чёрный полупрозрачный оверлей с модалью в центре

**Логирование:**
```
DEBUG [EvolutionModal] Timer started: 15s
DEBUG [EvolutionModal] Choice selected: TWIN
DEBUG [EvolutionModal] Auto-select after timeout: TRIPLE_SHOT
```

### XpBar (`frontend/components/XpBar.tsx`)

Полоса опыта внизу экрана.

**Отображает:**
- Текущий уровень: "Level 5"
- Прогресс-бар: визуальное заполнение (0-100%)
- Процент: "45% to Level 6"

**Обновляется при:**
- Получении SNAPSHOT с новым score
- Получении LEVEL_UP события

---

## WebSocket Протокол

### ClientOp — Клиент → Сервер

| Опкод | Значение | Формат | Описание |
|-------|----------|--------|---------|
| `JOIN` | 0x01 | `[0x01][name_len:1][name:*]` | Присоединиться к комнате |
| `INPUT` | 0x02 | `[0x02][dx:s8][dy:s8][shoot:1]` | Ввод движения и стрельбы |
| `SPAWN` | 0x03 | `[0x03]` | Возродиться после смерти |
| **`CHOOSE_EVOLUTION`** | **0x04** | **`[0x04][tankType:u8]`** | **Выбрать эволюцию** |

### ServerOp — Сервер → Клиент

| Опкод | Значение | Формат | Описание |
|-------|----------|--------|---------|
| `WELCOME` | 0x01 | `[0x01][playerId:1][roomId:*]` | Добро пожаловать в комнату |
| `SNAPSHOT` | 0x02 | `[0x02][...state]` | Снимок состояния игры |
| `DEATH` | 0x03 | `[0x03]` | Вы погибли |
| **`LEVEL_UP`** | **0x04** | **`[0x04][level:u8][count:u8][types:count×u8]`** | **Повышение уровня** |
| `ROOM_FULL` | 0x05 | `[0x05][newRoomId:*]` | Комната заполнена |
| `PLAYER_JOINED` | 0x06 | `[0x06][playerId:1]` | Игрок присоединился |
| `PLAYER_LEFT` | 0x07 | `[0x07][playerId:1]` | Игрок отключился |

### Формат LEVEL_UP (подробно)

**Пример 1: Уровень 3 с выбором эволюции**

```
Байты:           [0x04] [0x03] [0x04] [0x01] [0x02] [0x04] [0x03]
Значение:         OP    Level  Count  TWIN  SNIPER FLANK MACHINE_GUN
Описание:        "Повышен до уровня 3, доступные: TWIN, SNIPER, FLANK, MACHINE_GUN"
```

**Пример 2: Уровень 4 без эволюции**

```
Байты:           [0x04] [0x04] [0x00]
Значение:         OP    Level  Count (нет вариантов)
Описание:        "Повышен до уровня 4"
```

---

## Flow: Kill → Level-up → Evolution

### 1️⃣ Убийство

```
Game Loop (20 TPS, каждые 50ms):
├─ Обнаружено: killer.health > 0 && victim.health <= 0
└─ Событие: onKill(killer, victim)
```

### 2️⃣ Начисление XP

```
Backend: XpSystem.awardKillXp(killer, victim)
├─ xp = 50 + victim.score
├─ killer.score += xp
└─ Логирование: { event: 'kill_xp', xp: 150 }
```

### 3️⃣ Проверка повышения

```
Backend: XpSystem.checkLevelUp(killer)
├─ Проверка: killer.score >= XP_THRESHOLDS[killer.level + 1]
├─ Если истина:
│  ├─ killer.level++
│  ├─ Логирование: { event: 'level_up', newLevel: 3 }
│  └─ Если level in EVOLUTION_LEVELS:
│     └─ choices = getTankDefinition(killer.tankType).evolvesTo
└─ Возврат: LevelUpEvent { playerId, newLevel, evolutionChoices }
```

### 4️⃣ Отправка на клиент

```
Backend: GameLoop.onPlayerLevelUp(levelUpEvent)
├─ Кодирование: encoder.encodeLevelUp(levelUpEvent)
│  └─ [0x04][level][count][types...]
├─ Отправка: ws.publish(roomId, buffer)
└─ Логирование: DEBUG [GameServer] LEVEL_UP broadcast
```

### 5️⃣ Получение клиентом

```
Frontend: GameClient.handleMessage(Uint8Array)
├─ Парсинг: op = 0x04, level = data[1], choices = data[3..]
├─ Обновление: state.playerLevel, state.evolutionChoices
├─ Показ: state.showEvolutionModal = (choices.length > 0)
└─ Событие: levelUpListeners.forEach(l => l(level, choices))
```

### 6️⃣ Отображение модали

```
Frontend: GameHUD рендеринг
├─ Если showEvolutionModal:
│  └─ <EvolutionModal choices={evolutionChoices} />
│     ├─ Таймер: 15 сек
│     ├─ Кнопки: для каждой эволюции
│     └─ callback: onSelect(tankType)
└─ Таймер истёк → auto-select choices[0]
```

### 7️⃣ Выбор эволюции

```
Frontend: onEvolutionSelect(tankType: TWIN)
└─ GameClient.sendEvolutionChoice(tankType)
   └─ Отправка: [0x04][0x01] (CHOOSE_EVOLUTION + TWIN)
```

### 8️⃣ Обработка выбора на сервере

```
Backend: onMessage(CHOOSE_EVOLUTION)
├─ Валидация: chosenType in currentTank.evolvesTo
├─ Если OK:
│  ├─ Масштабирование HP: health *= (newMax / oldMax)
│  ├─ Обновление: player.tankType = chosenType
│  └─ Логирование: { event: 'evolution', from: BASIC, to: TWIN }
└─ Отправка нового SNAPSHOT со сцены
```

### 9️⃣ Обновление на клиенте

```
Frontend: Получен новый SNAPSHOT
├─ Парсинг: playerState.tankType = TWIN
├─ Обновление: GameState.players.get(playerId).tankType = TWIN
├─ Скрытие: showEvolutionModal = false
└─ Перерисовка HUD (canvas обновит визуализацию танка)
```

---

## Ключевые файлы

### Backend

| Файл | Функция | Строки |
|------|---------|--------|
| `backend/src/game/systems/XpSystem.ts` | `awardKillXp()`, `checkLevelUp()` | 24-63 |
| `backend/src/game/entities/Tank.ts` | `TANK_DEFINITIONS` | 3+ |
| `backend/src/game/engine/GameLoop.ts` | `onPlayerLevelUp()` callback | 98-116 |
| `backend/src/ws/handlers/onMessage.ts` | `ClientOp.CHOOSE_EVOLUTION` | 74-106 |
| `backend/src/ws/protocol/decoder.ts` | Парсинг CHOOSE_EVOLUTION | 93-101 |
| `backend/src/ws/protocol/encoder.ts` | Кодирование LEVEL_UP | — |

### Frontend

| Файл | Функция | Строки |
|------|---------|--------|
| `frontend/game/GameClient.ts` | `sendEvolutionChoice()` | 70-84 |
| `frontend/game/GameClient.ts` | `handleMessage()` LEVEL_UP | 240-264 |
| `frontend/game/GameState.ts` | `evolutionChoices`, `playerLevel` | — |
| `frontend/components/EvolutionModal.tsx` | Модаль выбора | 1-140+ |
| `frontend/components/XpBar.tsx` | Полоса опыта | 1-80+ |
| `frontend/components/GameHUD.tsx` | Интеграция компонентов | 1-50+ |

### Shared (типы)

| Файл | Содержимое |
|------|-----------|
| `shared/src/index.ts` | `enum TankType`, `enum ServerOp`, `enum ClientOp`, `EVOLUTION_LEVELS`, `XP_THRESHOLDS`, `interface TankDefinition` |

---

## Примеры использования

### Для разработчика: добавить новый танк

```typescript
// backend/src/game/entities/Tank.ts
[TankType.NEW_TANK]: {
  type: TankType.NEW_TANK,
  name: 'New Tank',
  maxHealth: 105,
  speed: 195,
  radius: 20,
  cannonCount: 2,
  fireRate: 500,
  bulletSpeed: 400,
  bulletDamage: 18,
  bulletLifetime: 2,
  evolvesFrom: TankType.BASIC,      // Доступен после BASIC
  evolvesTo: [TankType.SOME_TIER3],  // Может эволюционировать в...
  firingPattern: FiringPattern.TWIN,
}
```

### Для разработчика: подписаться на эволюцию

```typescript
// frontend: слушать level-up событие
const gameClient = new GameClient();

gameClient.onLevelUp((level, choices) => {
  console.log(`Уровень ${level}, доступные: ${choices.map(t => getTankName(t)).join(', ')}`);

  // Здесь модаль уже отображается автоматически
});

gameClient.onStateChange((state) => {
  console.log(`Показать модаль? ${state.showEvolutionModal}`);
});
```

### Для QA: проверить эволюцию

1. **Kill до уровня 3** — поднять уровень 1 игрока до 3
2. **Проверить модаль** — должна появиться с 4 вариантами
3. **Выбрать эволюцию** — кликнуть TWIN
4. **Проверить обновление** — tankType изменится в HUD
5. **Убить и снова** — repeat на уровнях 6 и 9

---

## Логирование

### Backend логи (DEBUG)

```
DEBUG [XpSystem] player levelled up: { event: 'level_up', playerId: 1, newLevel: 3, xp: 250 }
DEBUG [GameLoop] LEVEL_UP event emitted: playerId=1, choices=[1,2,4,3]
DEBUG [GameServer] LEVEL_UP broadcast to room: room-123
DEBUG [onMessage] CHOOSE_EVOLUTION received: tankType=1 (TWIN)
DEBUG [onMessage] Evolution applied: BASIC → TWIN, health scaled: 100 → 110
```

### Frontend логи (DEBUG)

```
DEBUG [GameClient] connected to ws://localhost:3002
DEBUG [GameClient] LEVEL_UP received: level=3, choices=[1,2,4,3]
DEBUG [EvolutionModal] Timer started: 15s remaining
DEBUG [EvolutionModal] Choice selected: TWIN
DEBUG [GameClient] CHOOSE_EVOLUTION sent: tankType=1
```

---

## Тестирование

### Юнит-тесты (Backend)

- ✅ `XpSystem.test.ts`: `awardKillXp()`, `checkLevelUp()`
- ✅ `CombatSystem.test.ts`: firing patterns для каждого танка

### Интеграционные тесты

- 🔄 Full flow: kill → level-up → choose evolution → update snapshot
- 🔄 Edge cases: multi-level jumps, max level, invalid evolution choices

### UI тесты (Frontend)

- 🆕 `EvolutionModal.test.tsx`: rendering, timer, selection
- 🆕 `XpBar.test.tsx`: level display, progress calculation

---

## Troubleshooting

### Проблема: Модаль не показывается при level-up

**Решение:**
1. Проверьте, что `EVOLUTION_LEVELS` включает этот уровень (3, 6, 9)
2. Проверьте, что `evolvesTo` не пустой для текущего танка
3. Проверьте логи: `LEVEL_UP encoded with count > 0?`

### Проблема: Выбор эволюции не применился

**Решение:**
1. Проверьте серверные логи: `Evolution applied`?
2. Проверьте, что выбранный танк в `evolvesTo` текущего
3. Проверьте `snapshot` — содержит ли новый `tankType`?

### Проблема: HP не масштабировалось при эволюции

**Решение:**
1. Проверьте формулу: `health *= (newMax / oldMax)`
2. Проверьте `oldTankDef.maxHealth` и `newTankDef.maxHealth`
3. Логирование: добавьте DEBUG перед и после масштабирования

---

## Ссылки

- **Backend архитектура:** `.ai-factory/ARCHITECTURE.md`
- **GameLoop детали:** `backend/src/game/engine/GameLoop.ts`
- **Протокол:** `shared/src/index.ts`
- **Эволюция в ROADMAP:** `.ai-factory/ROADMAP.md`
