// 森林鐵路「已發車／下一班」判斷，拆出來讓測試可以直接用固定時間驗證。
import type { RailTrip } from "./rail-data";
import { timeToMinutes } from "./schedule-utils";

/**
 * 這班車在今天的狀態。旅客可能從中途站上車（例如北門），所以不能只看始發站：
 * 「還搭得到」= 終點站以外，還有任何一站的發車時間還沒到。
 * - past：每個可上車的站都開走了
 * - next：這個方向第一班還搭得到的車，記下最近一個還沒開走的站
 * - later：之後的班次
 * nowMinutes 為 null 代表還沒掛載（不顯示狀態，避免 hydration 不一致）
 */
export type TripStatus =
  | { kind: "past"; nowMinutes: number }
  | { kind: "next"; nowMinutes: number; stop: string; time: string; minutesLeft: number }
  | { kind: "later"; nowMinutes: number }
  | null;

export function statusesFor(trips: RailTrip[], nowMinutes: number | null): TripStatus[] {
  if (nowMinutes === null) return trips.map(() => null);
  let nextAssigned = false;
  return trips.map((trip) => {
    const boardable = trip.segments.slice(0, -1); // 終點站只下車，不算上車站
    const upcoming = boardable.find((seg) => timeToMinutes(seg.time) >= nowMinutes);
    if (!upcoming) return { kind: "past", nowMinutes };
    if (!nextAssigned) {
      nextAssigned = true;
      return {
        kind: "next",
        nowMinutes,
        stop: upcoming.stop,
        time: upcoming.time,
        minutesLeft: timeToMinutes(upcoming.time) - nowMinutes,
      };
    }
    return { kind: "later", nowMinutes };
  });
}
