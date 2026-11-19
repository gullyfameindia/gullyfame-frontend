import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet } from "../client";
import type { Progress } from "./userService";

/** GET /user/homeScreen - everything the home screen shows, in one call. */

export interface HomeBanner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
}

export interface HomeCategory {
  id: string;
  name: string;
  icon: string;
}

export interface HomeTrendingReel {
  id: string;
  title: string;
  /** The backend fills this with the reel's vote count. */
  views: number;
  image: string;
  likes: number;
}

export interface HomeCompetition {
  id: string;
  title: string;
  image: string;
  prize?: number;
  startDate?: string;
  endDate?: string;
  participants?: number;
  views?: number;
}

export interface HomeTopCompetitor {
  rank: number;
  name: string;
  points: number;
  image: string;
}

export interface HomeScreenData {
  banners: HomeBanner[];
  categories: HomeCategory[];
  trending: HomeTrendingReel[];
  upcomingCompetitions: HomeCompetition[];
  pastCompetitions: HomeCompetition[];
  topCompetitors: HomeTopCompetitor[];
  liveCompetitions: HomeCompetition[];
  progress: Progress | null;
  // null when daily missions are switched off on the server
  dailyMission: { target: number; current: number; completed: boolean } | null;
}

export const HOME_SCREEN_CACHE_KEY = "@gullyfame_home_screen";

/** Fetches the home screen and keeps a copy so the next visit can show it straight away. */
export const getHomeScreen = async () => {
  const data = await apiGet<HomeScreenData>("user/homeScreen");
  AsyncStorage.getItem("userId")
    .then((userId) => AsyncStorage.setItem(HOME_SCREEN_CACHE_KEY, JSON.stringify({ userId, data })))
    .catch(() => {});
  return data;
};

/** The last home screen this signed-in user loaded, or null (another account's copy is ignored). */
export async function getCachedHomeScreen(): Promise<HomeScreenData | null> {
  try {
    const [[, saved], [, userId]] = await AsyncStorage.multiGet([HOME_SCREEN_CACHE_KEY, "userId"]);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed?.userId === userId && parsed?.data ? (parsed.data as HomeScreenData) : null;
  } catch {
    return null;
  }
}
