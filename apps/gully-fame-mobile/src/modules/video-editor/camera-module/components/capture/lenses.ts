import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** A bundled asset (`require(...)`) or a remote URL. */
export type LensAsset = number | string;

/** Normalized (0..1) placement of the overlay over the preview. Defaults to full screen. */
export interface LensRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Lens {
  id: string;
  name: string;
  iconUrl: LensAsset;
  overlayUrl: LensAsset;
  overlayRect?: LensRect;
  hintText: string;
  category: string;
  isSaved: boolean;
}

export const FULL_FRAME: LensRect = { x: 0, y: 0, width: 1, height: 1 };

// No lenses endpoint exists in the Postman collection yet, so these are local mocks.
const MOCK_LENSES: Omit<Lens, "isSaved">[] = [
  {
    id: "gully-frame",
    name: "Gully Frame",
    iconUrl: require("../../../../../../assets/images/logo.webp"),
    overlayUrl: require("../../../../../../assets/lenses/gully-frame.png"),
    hintText: "Press Record To Start",
    category: "Frames",
  },
  {
    id: "trophy",
    name: "Champion",
    iconUrl: require("../../../../../../assets/stickers/trophy.png"),
    overlayUrl: require("../../../../../../assets/stickers/trophy.png"),
    overlayRect: { x: 0.58, y: 0.14, width: 0.36, height: 0.2 },
    hintText: "Show off your win",
    category: "Stickers",
  },
  {
    id: "popcorn",
    name: "Movie Night",
    iconUrl: require("../../../../../../assets/stickers/popcorn.png"),
    overlayUrl: require("../../../../../../assets/stickers/popcorn.png"),
    overlayRect: { x: 0.06, y: 0.47, width: 0.34, height: 0.19 },
    hintText: "Press Record To Start",
    category: "Stickers",
  },
  {
    id: "controller",
    name: "Gamer",
    iconUrl: require("../../../../../../assets/stickers/controller.png"),
    overlayUrl: require("../../../../../../assets/stickers/controller.png"),
    overlayRect: { x: 0.32, y: 0.16, width: 0.36, height: 0.2 },
    hintText: "Game on!",
    category: "Stickers",
  },
  {
    id: "santa",
    name: "Festive",
    iconUrl: require("../../../../../../assets/stickers/whitesanta.png"),
    overlayUrl: require("../../../../../../assets/stickers/whitesanta.png"),
    overlayRect: { x: 0.06, y: 0.14, width: 0.36, height: 0.2 },
    hintText: "Spread the cheer",
    category: "Seasonal",
  },
];

const SAVED_LENSES_KEY = "camera.savedLensIds";

export function useLenses() {
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved: string[] = [];
      try {
        saved = JSON.parse((await AsyncStorage.getItem(SAVED_LENSES_KEY)) ?? "[]");
      } catch { /* intentionally ignored */}
      if (cancelled) return;
      setLenses(MOCK_LENSES.map(lens => ({ ...lens, isSaved: saved.includes(lens.id) })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Saved locally only: there is no save-lens endpoint in the backend yet.
  const toggleSaved = useCallback((id: string) => {
    setLenses(prev => {
      const next = prev.map(lens => (lens.id === id ? { ...lens, isSaved: !lens.isSaved } : lens));
      AsyncStorage.setItem(SAVED_LENSES_KEY, JSON.stringify(next.filter(l => l.isSaved).map(l => l.id))).catch(() => {});
      return next;
    });
  }, []);

  return { lenses, loading, toggleSaved };
}
