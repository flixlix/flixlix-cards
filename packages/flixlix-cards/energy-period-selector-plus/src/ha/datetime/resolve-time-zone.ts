import { TimeZone } from "../data/translation";

const RESOLVED_TIME_ZONE = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;

export const LOCAL_TIME_ZONE = RESOLVED_TIME_ZONE ?? "UTC";

export const resolveTimeZone = (option: TimeZone, serverTimeZone: string) =>
  option === TimeZone.local && RESOLVED_TIME_ZONE ? LOCAL_TIME_ZONE : serverTimeZone;
