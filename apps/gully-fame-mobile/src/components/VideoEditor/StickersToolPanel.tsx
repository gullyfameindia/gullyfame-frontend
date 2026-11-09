import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listStickers, searchStickers } from "@/api/services/stickerEmojiService";
import { SkeletonGrid } from "@/components/Skeleton/Skeleton";

export interface StickerItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  x: number; // Position (0-1 relative)
  y: number;
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
}

interface Sticker {
  _id: string;
  id?: string;
  name: string;
  imageUrl: string;
  url?: string;
  category: string;
  isActive: boolean;
}

interface StickersToolPanelProps {
  onClose: () => void;
  onAddSticker: (sticker: Omit<StickerItem, "id">) => void;
  currentTime: number;
  videoDuration: number;
}

const CATEGORIES = ["All", "Reactions", "Emojis", "Shapes", "Text", "Effects"];

export default function StickersToolPanel({
  onClose,
  onAddSticker,
  currentTime,
  videoDuration,
}: StickersToolPanelProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // Only the newest request may update state (category/search changes can overlap).
  const latestRequest = useRef(0);

  useEffect(() => {
    fetchStickers();
  // Category changes fetch immediately; search is debounced in the effect below. fetch* is
  // re-created each render, so it is deliberately not a dependency (it would loop).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchStickers();
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above: debounced on searchQuery only.
  }, [searchQuery]);

  const fetchStickers = async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);

      let result;
      if (searchQuery.trim()) {
        // Use search service for filtered results
        result = await searchStickers(searchQuery);
      } else if (selectedCategory !== "All") {
        // Use list service with category filter
        result = await listStickers(selectedCategory.toLowerCase());
      } else {
        // Get all stickers
        result = await listStickers();
      }

      if (requestId !== latestRequest.current) return;
      if (result.success && result.data) {
        const stickerList = result.data;

        // Map service response to component interface
        const mappedStickers: Sticker[] = stickerList.map((s: any) => ({
          _id: s.id || s._id || "",
          id: s.id || s._id || "",
          name: s.name || "Sticker",
          imageUrl: s.url || s.imageUrl || "",
          url: s.url || s.imageUrl || "",
          category: s.category || "general",
          isActive: s.isActive !== false,
        }));

        setStickers(mappedStickers);
      } else {
        setError(result.message || "Failed to load stickers");
        setStickers([]);
      }
    } catch {
      if (requestId !== latestRequest.current) return;
      setError("Failed to load stickers");
      setStickers([]);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  const filteredStickers = stickers.filter((sticker) => {
    const matchesSearch = sticker.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      sticker.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory && sticker.isActive;
  });

  const handleStickerSelect = (sticker: Sticker) => {
    const newSticker: Omit<StickerItem, "id"> = {
      name: sticker.name,
      imageUrl: sticker.imageUrl,
      category: sticker.category,
      x: 0.5, // Center
      y: 0.5, // Center
      scale: 1.0,
      rotation: 0,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, videoDuration), // Default 3 seconds
    };

    onAddSticker(newSticker);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>STICKERS</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stickers"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stickers Grid */}
      {loading ? (
        <SkeletonGrid count={8} columns={4} aspectRatio={1} gap={10} style={{ padding: 16 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchStickers}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredStickers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="happy-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>
                {stickers.length === 0
                  ? "No stickers available"
                  : "No stickers found"}
              </Text>
            </View>
          ) : (
            <View style={styles.stickersGrid}>
              {filteredStickers.map((sticker) => (
                <TouchableOpacity
                  key={sticker._id}
                  style={styles.stickerCard}
                  onPress={() => handleStickerSelect(sticker)}
                  activeOpacity={0.7}
                >
                  <View style={styles.stickerImageContainer}>
                    <Image
                      source={{ uri: sticker.imageUrl || sticker.url }}
                      style={styles.stickerImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.stickerName} numberOfLines={1}>
                    {sticker.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#888" />
        <Text style={styles.infoText}>
          Tap a sticker to add it to your video. After adding, you can drag,
          scale, and rotate it on the video preview.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categories: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
  },
  categoryButtonActive: {
    backgroundColor: "#EC9A15",
  },
  categoryText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  stickersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stickerCard: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
  },
  stickerImageContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  stickerImage: {
    width: "100%",
    height: "100%",
  },
  stickerName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
});
