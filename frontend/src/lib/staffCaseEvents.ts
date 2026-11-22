/**
 * Case desks' live hook. It runs on the shared staff live bus (`lib/staffLive.ts`), which also
 * carries `staffDataChanged` for every other console area.
 */
export { useStaffCaseEvents, type StaffCaseChange } from "@/lib/staffLive";
