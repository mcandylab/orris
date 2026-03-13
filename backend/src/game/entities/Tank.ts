import { TankType, TankDefinition, TANK_DEFINITIONS } from '@orris/shared';

export function getTankDefinition(type: TankType): TankDefinition {
  return TANK_DEFINITIONS[type];
}
