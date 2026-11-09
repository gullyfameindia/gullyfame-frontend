import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listSoundFX, searchSoundFX } from "@/api/services/soundFXService";
import { SkeletonList } from "@/components/Skeleton/Skeleton";

interface SoundEffect {
  _id: string;
  name: string;
  url: string;
  category: string;
  duration: number;
  isActive: boolean;
}

interface SoundFXToolPanelProps {
  onClose: () => void;
  onAddSoundFX: (soundFX: {
    id: string;
    name: string;
    url: string;
    duration: number;
  }) => void;
  currentTime: number;
}

// Predefined sound effects (fallback if API returns empty)

const CATEGORIES = ["All", "Transitions", "UI", "Impact", "Notifications"];

export default function SoundFXToolPanel({
  onClose,
  onAddSoundFX,
  currentTime,
}: SoundFXToolPanelProps) {
  const [soundEffects, setSoundEffects] = useState<SoundEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [sound, setSound] = useState<any>(null);
  // Only the newest request may update state (category/search changes can overlap).
  const latestRequest = useRef(0);

  useEffect(() => {
    fetchSoundEffects();
    return () => {
      if (sound && sound.unloadAsync) {
        sound.unloadAsync();
      }
    };
  // Category changes fetch immediately; search is debounced in the effect below. fetch* is
  // re-created each render, so it is deliberately not a dependency (it would loop).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchSoundEffects();
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above: debounced on searchQuery only.
  }, [searchQuery]);

  const fetchSoundEffects = async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);

      let result;
      if (searchQuery.trim()) {
        // Use search service for filtered results
        result = await searchSoundFX(searchQuery);
      } else if (selectedCategory !== "All") {
        // Use list service with category filter
        result = await listSoundFX(selectedCategory.toLowerCase());
      } else {
        // Get all sound effects
        result = await listSoundFX();
      }

      if (requestId !== latestRequest.current) return;
      if (result.success && result.data) {
        const sfxList = result.data;

        // Map service response to component interface
        const mappedFX: SoundEffect[] = sfxList.map((fx: any) => ({
          _id: fx._id || fx.id || "",
          name: fx.name || fx.title || "Sound Effect",
          url: fx.audioUrl || fx.audio_url || fx.url || "",
          category: fx.category || "general",
          duration: fx.duration || 1,
          isActive: fx.isActive !== false,
        }));

        setSoundEffects(mappedFX);
      } else {
        setError(result.message || "Failed to load sound effects");
        setSoundEffects([]);
      }
    } catch {
      if (requestId !== latestRequest.current) return;
      setError("Failed to load sound effects");
      setSoundEffects([]);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  const filteredSoundEffects = soundEffects.filter((sfx) => {
    const matchesSearch = sfx.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      sfx.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handlePreview = async (sfx: SoundEffect) => {
    try {
      if (sound && sound.unloadAsync) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (previewingId === sfx._id) {
        setPreviewingId(null);
      } else {
        // Try to load audio preview, but gracefully fail
        let Audio;
        try {
          Audio = require('expo-audio').Audio;
        } catch {
          Alert.alert("Info", "Audio preview not available in this build. Added to timeline instead.");
          onAddSoundFX({
            id: sfx._id,
            name: sfx.name,
            url: sfx.url,
            duration: sfx.duration,
          });
          return;
        }
        
        if (Audio && Audio.Sound && Audio.Sound.createAsync) {
          try {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: sfx.url },
              { shouldPlay: true, volume: 0.8 }
            );
            setSound(newSound);
            setPreviewingId(sfx._id);

            newSound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded && status.didJustFinish) {
                setPreviewingId(null);
              }
            });
          } catch {
            Alert.alert("Error", "Failed to play audio preview");
          }
        } else {
          Alert.alert("Info", "Audio preview not available");
        }
      }
    } catch {
      Alert.alert("Error", "Failed to preview sound effect");
    }
  };

  const handleAddSoundFX = async (sfx: SoundEffect) => {
    if (sound) {
      if (sound.unloadAsync) {
        await sound.unloadAsync();
      }
      setSound(null);
      setPreviewingId(null);
    }

    onAddSoundFX({
      id: sfx._id,
      name: sfx.name,
      url: sfx.url,
      duration: sfx.duration,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SOUND FX</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sound effects"
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

      {/* Sound Effects List */}
      {loading ? (
        <SkeletonList rows={6} avatarSize={40} avatarRadius={8} trailing style={{ paddingHorizontal: 16 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSoundEffects}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredSoundEffects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="volume-mute" size={48} color="#666" />
              <Text style={styles.emptyText}>No sound effects found</Text>
            </View>
          ) : (
            filteredSoundEffects.map((sfx) => (
              <View key={sfx._id} style={styles.soundItem}>
                <View style={styles.soundIcon}>
                  <Ionicons name="musical-notes" size={24} color="#EC9A15" />
                </View>

                <View style={styles.soundInfo}>
                  <Text style={styles.soundName}>{sfx.name}</Text>
                  <View style={styles.soundMeta}>
                    <Text style={styles.soundCategory}>{sfx.category}</Text>
                    <Text style={styles.soundDuration}>
                      {sfx.duration.toFixed(1)}s
                    </Text>
                  </View>
                </View>

                <View style={styles.soundActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePreview(sfx)}
                  >
                    <Ionicons
                      name={
                        previewingId === sfx._id ? "pause-circle" : "play-circle"
                      }
                      size={32}
                      color="#EC9A15"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddSoundFX(sfx)}
                  >
                    <Ionicons name="add-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#888" />
        <Text style={styles.infoText}>
          Sound effects will be added at {currentTime.toFixed(1)}s. Adjust timing
          on the audio track after adding.
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
  list: {
    flex: 1,
    paddingHorizontal: 20,
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
  },
  soundItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  soundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(236, 154, 21, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  soundMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  soundCategory: {
    color: "#888",
    fontSize: 12,
    textTransform: "capitalize",
  },
  soundDuration: {
    color: "#666",
    fontSize: 12,
  },
  soundActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
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
