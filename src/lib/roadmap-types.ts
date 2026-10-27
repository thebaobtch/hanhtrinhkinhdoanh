export type Quest = { title: string; detail: string; checkpoint: string };
export type Stage = {
  name: string;
  emoji: string;
  goal: string;
  timeframe: string;
  kpi: string;
  reward: string;
  xp: number;
  quests: Quest[];
};
export type Roadmap = {
  owner: string;
  topic: string;
  summary: string;
  sellingSystem: string[];
  stages: Stage[];
  finalReward: string;
};
