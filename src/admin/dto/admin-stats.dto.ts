export interface AlertsByDayDto {
  date: string;
  count: number;
}

export interface CountersDto {
  users: number;
  articles: number;
  alerts: number;
  shops: number;
  messages: number;
}

export interface FraudStatsDto {
  high: number;
  medium: number;
  riskIndex: number;
}

export interface AdminStatsDto {
  counters: CountersDto;
  fraud: FraudStatsDto;
  alertsByDay: AlertsByDayDto[];
}
