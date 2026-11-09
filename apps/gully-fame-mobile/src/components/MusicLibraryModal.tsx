import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  listAudio,
  getSavedAudio,
  toggleSaveAudio,
  filterTracksBySearch,
  type AudioSortOption,
} from '@/api/services/musicLibraryService';
import { SkeletonList } from "@/components/Skeleton/Skeleton";

interface MusicLibraryModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (music: any) => void;
  /** Currently chosen track ({ id, title }); shown as selected, with a Remove button. */
  selectedMusic?: any;
  onRemove?: () => void;
}

const TABS = ['For you', 'Trending', 'Saved', 'Popular'];

export const MusicLibraryModal: React.FC<MusicLibraryModalProps> = ({
  visible,
  onCancel,
  onSelect,
  selectedMusic,
  onRemove,
}) => {
  const [activeTab, setActiveTab] = useState('For you');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart Audio Fetcher with Category Fallback
  const fetchTracks = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setError(null);

    try {
      let response: any = null;

      // For you = newest, Trending / Popular = most used, Saved = GET /user/audio/saved.
      if (activeTab === 'Saved') {
        response = await getSavedAudio();
        if (response.success && searchQuery.trim()) {
          response = {
            ...response,
            data: { ...response.data, tracks: filterTracksBySearch(response.data.tracks, searchQuery) },
          };
        }
      } else {
        const sort: AudioSortOption = activeTab === 'For you' ? 'newest' : 'trending';
        response = await listAudio(sort, 1, 50, searchQuery.trim() || undefined);
      }

      if (!response?.success) {
        throw new Error(response?.message || 'Unable to load the music library');
      }
      const fetchedTracks = response.data?.tracks || [];

      setTracks(fetchedTracks);
    } catch (err: any) {
      setTracks([]);
      setError(err?.message || 'Unable to load the music library');
    } finally {
      setLoading(false);
    }
  }, [visible, activeTab, searchQuery]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // POST /user/audio/:id/save toggles; the result is shown immediately.
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const handleToggleSave = async (audioId: string) => {
    if (!audioId) return;
    const result = await toggleSaveAudio(audioId);
    if (result.success && result.data) {
      setSavedIds((prev) => ({ ...prev, [audioId]: result.data!.isSaved }));
      if (activeTab === 'Saved' && !result.data.isSaved) {
        setTracks((prev) => prev.filter((t) => (t._id || t.id) !== audioId));
      }
    } else {
      setError(result.message);
    }
  };

  const renderTrackItem = ({ item }: { item: any }) => {
    const isSelected = !!selectedMusic?.id && (selectedMusic.id === item._id || selectedMusic.id === item.id);
    const title = item.title || item.name || item.originalName || 'Audio Track';
    const artist = item.artist || item.singer || 'Gully Fame Audio';
    const duration = item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '0:30';

    const handleSelectTrack = () => {
      const trackWithMetadata = {
        ...item,
        _id: item._id || item.id,
        id: item._id || item.id,
        title: title,
        artist: artist,
        url: item.url ?? item.audioUrl,
        startTime: 0, // Start from beginning by default
      };
      onSelect(trackWithMetadata);
    };

    return (
      <TouchableOpacity
        style={[styles.trackCard, isSelected && styles.trackCardSelected]}
        onPress={handleSelectTrack}
        activeOpacity={0.7}
      >
        <View style={styles.trackImageBase}>
          <Ionicons name="musical-note" size={24} color="#EC9A15" />
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {artist} • {duration}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => handleToggleSave(item._id || item.id)}
          accessibilityLabel={savedIds[item._id || item.id] ?? item.isSaved ? 'Remove from saved' : 'Save track'}
        >
          <Ionicons
            name={(savedIds[item._id || item.id] ?? item.isSaved) ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color="#EC9A15"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectBtn}
          onPress={handleSelectTrack}
        >
          <Text style={styles.selectBtnText}>Use</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {selectedMusic?.id && onRemove ? (
            <TouchableOpacity style={styles.removeRow} onPress={onRemove} accessibilityLabel="Remove music">
              <Ionicons name="musical-note" size={16} color="#EC9A15" />
              <Text style={styles.removeText} numberOfLines={1}>
                {selectedMusic.title ?? 'Selected track'}
              </Text>
              <Text style={styles.removeAction}>Remove</Text>
            </TouchableOpacity>
          ) : null}

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search audio tracks..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                onPress={() => {
                  setActiveTab(tab);
                  setSearchQuery('');
                }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Track List or Loading */}
          {loading ? (
            <SkeletonList rows={7} avatarSize={48} avatarRadius={8} trailing style={{ paddingHorizontal: 16 }} />
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color="#444" style={{ marginBottom: 12 }} />
              <Text style={styles.noTracksTitle}>Couldn't load music</Text>
              <Text style={styles.noTracksSub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchTracks} accessibilityLabel="Retry loading music">
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : tracks.length > 0 ? (
            <FlatList
              data={tracks}
              keyExtractor={(item, index) => item._id || item.id || `track-${index}`}
              renderItem={renderTrackItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="musical-notes-outline" size={48} color="#444" style={{ marginBottom: 12 }} />
              <Text style={styles.noTracksTitle}>No tracks found</Text>
              <Text style={styles.noTracksSub}>Try searching or select another tab</Text>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  saveBtn: {
    padding: 8,
    marginRight: 4,
  },
  removeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  removeText: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
  removeAction: { color: '#FF5A4F', fontSize: 13, fontWeight: '700' },
  retryBtn: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 18, backgroundColor: '#EC9A15' },
  retryText: { color: '#000', fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#262626',
  },
  tabPillActive: {
    backgroundColor: '#EC9A15',
  },
  tabText: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTracksTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  noTracksSub: {
    color: '#888',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trackCardSelected: {
    borderColor: '#EC9A15',
    backgroundColor: 'rgba(236, 154, 21, 0.1)',
  },
  trackImageBase: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    color: '#AAA',
    fontSize: 12,
  },
  selectBtn: {
    backgroundColor: '#EC9A15',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default MusicLibraryModal;
