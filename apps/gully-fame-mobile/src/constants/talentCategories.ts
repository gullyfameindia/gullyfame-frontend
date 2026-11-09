import { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type TalentCategory = {
  key: string;
  name: string;
  tagline: string;
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
};

export const TALENT_CATEGORIES: TalentCategory[] = [
  { key: "music", name: "Music", tagline: "Mic-Drop", icon: "music-note", description: "Singing, covers, rap, beatboxing, original songs, and lip-sync videos." },
  { key: "dance", name: "Dance", tagline: "Dance-Off", icon: "human-female-dance", description: "Dance challenges, choreography, trending moves, and dance battles." },
  { key: "comedy", name: "Comedy", tagline: "Open Mic", icon: "emoticon-happy-outline", description: "Relatable jokes, memes, POVs, roasts, and funny skits." },
  { key: "food", name: "Food", tagline: "Foodie Mode", icon: "noodles", description: "Street food, recipes, food reviews, and cooking challenges." },
  { key: "fashion", name: "Fashion & Beauty", tagline: "Fit Check", icon: "hanger", description: "Outfit transitions, streetwear, GRWM, makeup, and styling tips." },
  
];
