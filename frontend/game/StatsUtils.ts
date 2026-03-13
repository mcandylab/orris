import { TankType, TANK_DEFINITIONS } from '@orris/shared';

export interface StatsDelta {
  health: number; // delta: newHealth - oldHealth
  speed: number;
  fireRate: number; // in ms, lower is better
  damage: number;
}

export interface StatsDisplay {
  health: string;
  speed: string;
  fireRate: string;
  damage: string;
}

/**
 * Calculate stats delta between two tank types.
 * Returns positive values for improvements, negative for downgrades.
 */
export function calculateStatsDelta(fromTankType: TankType, toTankType: TankType): StatsDelta {
  const fromDef = TANK_DEFINITIONS[fromTankType];
  const toDef = TANK_DEFINITIONS[toTankType];

  console.debug('DEBUG [StatsUtils] calculating delta:', {
    from: fromDef.name,
    to: toDef.name,
  });

  return {
    health: toDef.maxHealth - fromDef.maxHealth,
    speed: toDef.speed - fromDef.speed,
    fireRate: toDef.fireRate - fromDef.fireRate, // negative is better (faster)
    damage: toDef.bulletDamage - fromDef.bulletDamage,
  };
}

/**
 * Format stats delta for display.
 * Returns strings like "+10" or "-5" with color indicators.
 */
export function formatStatsDelta(delta: StatsDelta): StatsDisplay {
  const formatNumber = (value: number, lowerIsBetter: boolean = false): string => {
    if (value === 0) return '=';
    const sign = value > 0 ? '+' : '';
    // For fireRate, lower is better, so invert the display logic
    const isBetter =
      (lowerIsBetter && value < 0) || (!lowerIsBetter && value > 0);
    return sign + value;
  };

  return {
    health: formatNumber(delta.health),
    speed: formatNumber(delta.speed),
    fireRate: formatNumber(delta.fireRate, true), // lower fireRate (negative) = better
    damage: formatNumber(delta.damage),
  };
}

/**
 * Get color for stat change: green for improvement, red for downgrade, gray for neutral.
 */
export function getStatColor(
  delta: number,
  lowerIsBetter: boolean = false,
): string {
  if (delta === 0) return '#999'; // gray
  if (lowerIsBetter) {
    return delta < 0 ? '#4ade80' : '#f87171'; // green if lower, red if higher
  }
  return delta > 0 ? '#4ade80' : '#f87171'; // green if positive, red if negative
}

/**
 * Create a detailed stats comparison string.
 * Example output: "HP: 100 → 110 (+10)"
 */
export function createStatsComparisonString(
  fromTankType: TankType,
  toTankType: TankType,
): string {
  const fromDef = TANK_DEFINITIONS[fromTankType];
  const toDef = TANK_DEFINITIONS[toTankType];
  const delta = calculateStatsDelta(fromTankType, toTankType);

  const healthStr = `HP: ${fromDef.maxHealth} → ${toDef.maxHealth} (${delta.health > 0 ? '+' : ''}${delta.health})`;
  const speedStr = `Speed: ${fromDef.speed} → ${toDef.speed} (${delta.speed > 0 ? '+' : ''}${delta.speed})`;
  const damageStr = `Damage: ${fromDef.bulletDamage} → ${toDef.bulletDamage} (${delta.damage > 0 ? '+' : ''}${delta.damage})`;
  const fireRateStr = `RoF: ${fromDef.fireRate}ms → ${toDef.fireRate}ms (${delta.fireRate > 0 ? '+' : ''}${delta.fireRate}ms)`;

  return `${healthStr}\n${speedStr}\n${damageStr}\n${fireRateStr}`;
}
