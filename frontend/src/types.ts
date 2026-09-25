export type Kind = "meal" | "sleep" | "exercise" | "mood" | "course" | "task";
export type Meal = "早餐" | "午餐" | "晚餐";
export interface LifeRecord {
  id: string;
  kind: Kind;
  date: string;
  title: string;
  source?: "示例" | "手动" | "地图";
  start?: string;
  end?: string;
  place?: string;
  duration?: number;
  note?: string;
  done?: boolean;
  meal?: Meal;
  portion?: string;
  cost?: number;
  kcal?: number;
  protein?: number;
  planned?: boolean;
  sleepStart?: string;
  sleepEnd?: string;
  quality?: number;
  distance?: number;
  steps?: number;
  mode?: string;
  mood?: number;
  stress?: number;
  weekday?: number;
  weeks?: string;
  teacher?: string;
}
export interface Profile {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  major: string;
  gender: string;
}
export interface Preferences {
  healthGoal: string;
  healthWeight: number;
  timeWeight: number;
  costWeight: number;
  modes: string[];
  taste: string;
  avoid: string;
  budget: number;
  lead: number;
  termStart: string;
  learningRate: number;
  exploration: number;
  lstm: number;
  dropout: number;
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  link?: string;
  label?: string;
}
export interface UserData {
  records: LifeRecord[];
  awards: { lesson: string; score: number; date: string }[];
  messages: Message[];
  preferences: Preferences;
}
export interface Menu {
  id: string;
  meal: Meal;
  food: string;
  place: string;
  cost: number;
  kcal: number;
  protein: number;
  taste: string;
  minutes: number;
  ingredients: string;
}
export interface Place {
  id: string;
  name: string;
  address: string;
  position: [number, number];
}
export interface RouteResult {
  distance: number;
  seconds: number;
  path: [number, number][];
  steps: string[];
  mode: string;
}
export const kindLabels: Record<Kind, string> = {
  meal: "三餐",
  sleep: "睡眠",
  exercise: "运动",
  mood: "心情",
  course: "课程",
  task: "待办",
};
