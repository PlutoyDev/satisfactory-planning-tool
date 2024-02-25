/*
  Clockspeed of recipes
  ----------------------
  Shown as percentage, 100% is normal speed, 200% is double speed, etc. limited to 1% to 250%.
  Stored as a number that has no decimal places, but has 3 decimal places of precision.
  This is to avoid floating point errors when doing calculations with the number.
  Usually, referred to as "thouCs" (thousandth of clockspeed in percent) in the code.

  Formula:
  clockspeed percentage = (thouCs / 1000)%
  thouCs = clockspeed percentage * 1000
  clockspeed decimal = thouCs / 100_000
  thouCs = clockspeed decimal * 100_000

  percent can contain up to 3 decimal places, but is limited to 1.0000 to 250.0000.

  use Math.floor() to convert to integer for storage.
*/

const FromPercent = (percent: number): number => Math.floor(percent * 1000);
const ToPercent = (storedCs: number): number => storedCs / 1000;
const FromDecimal = (decimal: number): number => Math.floor(decimal * 100_000);
const ToDecimal = (storedCs: number): number => storedCs / 100_000;

const StoredClockspeed = {
  FromPercent,
  ToPercent,
  FromDecimal,
  ToDecimal,
};

export default StoredClockspeed;
