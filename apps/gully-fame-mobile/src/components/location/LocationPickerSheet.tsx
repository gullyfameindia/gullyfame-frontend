import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Clock, LocateFixed, MapPin, Search, X } from "lucide-react-native";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { colors, font, radius, space } from "@/theme/tokens";

/** A place attached to a post. Coordinates are present when the place came from GPS or search. */
export interface PickedLocation {
  name: string;
  latitude?: number;
  longitude?: number;
}

const RECENTS_KEY = "@gullyfame_recent_locations";
const MAX_RECENTS = 5;

/** "Andheri West, Mumbai, Maharashtra" from a reverse-geocode result (no repeats, no blanks). */
function formatPlace(a: Location.LocationGeocodedAddress): string {
  const parts = [a.district || a.name, a.city || a.subregion, a.region];
  const seen = new Set<string>();
  return parts
    .map((p) => (p || "").trim())
    .filter((p) => p && !/^\d/.test(p) && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
    .slice(0, 3)
    .join(", ");
}

async function placeFor(lat: number, lng: number): Promise<PickedLocation | null> {
  const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  const name = address ? formatPlace(address) : "";
  return name ? { name, latitude: lat, longitude: lng } : null;
}

/**
 * The current place, only when location access is already allowed (never shows a prompt).
 * Used to suggest a location on the post screen.
 */
export async function currentPlaceIfAllowed(): Promise<PickedLocation | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted" || !(await Location.hasServicesEnabledAsync())) return null;
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ||
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return await placeFor(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return null;
  }
}

async function loadRecents(): Promise<PickedLocation[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as PickedLocation[]) : [];
  } catch {
    return [];
  }
}

async function saveRecent(place: PickedLocation) {
  const list = (await loadRecents()).filter((p) => p.name.toLowerCase() !== place.name.toLowerCase());
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify([place, ...list].slice(0, MAX_RECENTS))).catch(() => {});
}

type GpsState = "idle" | "detecting" | "denied" | "blocked" | "off" | "failed";

/**
 * Bottom sheet for tagging a post with a place:
 * - detects the current place on open when location access is already allowed (otherwise one tap asks),
 * - suggests real places while typing (device geocoder), or uses the typed text as-is,
 * - remembers the last few places used.
 */
export default function LocationPickerSheet({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: PickedLocation | null;
  onClose: () => void;
  onSelect: (place: PickedLocation | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<PickedLocation | null>(null);
  const [gps, setGps] = useState<GpsState>("idle");
  const [results, setResults] = useState<PickedLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<PickedLocation[]>([]);
  // Android only allows place look-ups (suggestions) once location access is granted.
  const [allowed, setAllowed] = useState(false);
  const searchId = useRef(0);

  const detect = useCallback(async (ask: boolean) => {
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted" && ask) perm = await Location.requestForegroundPermissionsAsync();
      setAllowed(perm.status === "granted");
      if (perm.status !== "granted") {
        setGps(perm.canAskAgain === false ? "blocked" : ask ? "denied" : "idle");
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setGps("off");
        return;
      }
      setGps("detecting");
      // A recent fix is instant; otherwise ask for a fresh, city-level accurate one.
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ||
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const place = await placeFor(pos.coords.latitude, pos.coords.longitude);
      setCurrent(place);
      setGps(place ? "idle" : "failed");
    } catch {
      setGps("failed");
    }
  }, []);

  // Each time the sheet opens: reset the search, load recents, and auto-detect if already allowed.
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setResults([]);
    loadRecents().then(setRecents);
    if (!current) detect(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Place suggestions for what's typed (debounced); the typed text itself is always an option.
  useEffect(() => {
    const q = query.trim();
    const id = ++searchId.current;
    if (q.length < 3 || !allowed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const hits = (await Location.geocodeAsync(q)).slice(0, 4);
        const places = (
          await Promise.all(hits.map((h) => placeFor(h.latitude, h.longitude).catch(() => null)))
        ).filter((p): p is PickedLocation => !!p);
        const unique = places.filter((p, i) => places.findIndex((o) => o.name === p.name) === i);
        if (id === searchId.current) setResults(unique);
      } catch {
        if (id === searchId.current) setResults([]);
      } finally {
        if (id === searchId.current) setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [query, allowed]);

  const choose = (place: PickedLocation) => {
    saveRecent(place);
    onSelect(place);
    onClose();
  };

  const typed = query.trim();
  const isSelected = (p: PickedLocation) => value?.name.toLowerCase() === p.name.toLowerCase();

  const renderRow = (place: PickedLocation, icon: React.ReactNode, sub?: string) => (
    <TouchableOpacity key={place.name} style={styles.row} onPress={() => choose(place)} accessibilityRole="button">
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowText} numberOfLines={1}>{place.name}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {isSelected(place) ? <Check size={20} color={colors.accent} strokeWidth={2.5} /> : null}
    </TouchableOpacity>
  );

  const gpsHint =
    gps === "blocked"
      ? "Location access is off for Gully Fame. Turn it on in Settings."
      : gps === "denied"
        ? "Location access was not allowed."
        : gps === "off"
          ? "Turn on your phone's location (GPS) and try again."
          : gps === "failed"
            ? "Couldn't find your location. Try again or type it."
            : "Find where you are right now";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingScreen style={styles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Add location</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.search}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search a place or type your own"
              placeholderTextColor={colors.placeholder}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => typed && choose({ name: typed })}
              testID="location-search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.sm }}>
            {typed ? (
              <>
                {renderRow({ name: typed }, <MapPin size={20} color={colors.accent} />, "Use exactly what you typed")}
                {!allowed ? (
                  <TouchableOpacity
                    style={styles.allowRow}
                    onPress={() => (gps === "blocked" ? Linking.openSettings() : detect(true))}
                    accessibilityRole="button"
                  >
                    <Text style={styles.allowText}>
                      {gps === "blocked"
                        ? "Turn on location access in Settings to see matching places."
                        : "Allow location access to see matching places."}
                    </Text>
                    <Text style={styles.allowLink}>{gps === "blocked" ? "Settings" : "Allow"}</Text>
                  </TouchableOpacity>
                ) : searching ? (
                  <ActivityIndicator color={colors.accent} style={{ marginVertical: space.md }} />
                ) : (
                  results.map((p) => renderRow(p, <MapPin size={20} color={colors.textBody} />))
                )}
              </>
            ) : (
              <>
                {current ? (
                  renderRow(current, <LocateFixed size={20} color={colors.accent} />, "Your current location")
                ) : (
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => (gps === "blocked" ? Linking.openSettings() : detect(true))}
                    disabled={gps === "detecting"}
                    accessibilityRole="button"
                    testID="location-use-current"
                  >
                    <View style={styles.rowIcon}>
                      {gps === "detecting" ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <LocateFixed size={20} color={colors.accent} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowText}>
                        {gps === "detecting" ? "Finding your location…" : gps === "blocked" ? "Open Settings" : "Use current location"}
                      </Text>
                      <Text style={styles.rowSub}>{gpsHint}</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {recents.length > 0 ? <Text style={styles.label}>Recent</Text> : null}
                {recents.map((p) => renderRow(p, <Clock size={20} color={colors.textBody} />))}
              </>
            )}
          </ScrollView>

          {value ? (
            <TouchableOpacity
              style={styles.remove}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.removeText}>Remove location</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)" },
  sheet: {
    maxHeight: "80%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
    paddingTop: space.sm,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xl, paddingBottom: space.md },
  title: { color: colors.text, fontSize: 20, fontFamily: font.titleMedium },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.xl,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 15, fontFamily: font.regular, paddingVertical: 0 },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xl, paddingVertical: 10 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: { color: colors.text, fontSize: 15, fontFamily: font.semibold },
  rowSub: { color: colors.textMuted, fontSize: 12, fontFamily: font.regular, marginTop: 1 },
  allowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginHorizontal: space.xl,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.field,
  },
  allowText: { flex: 1, color: colors.textBody, fontSize: 13, lineHeight: 18, fontFamily: font.regular },
  allowLink: { color: colors.accent, fontSize: 14, fontFamily: font.semibold },
  remove: { alignItems: "center", paddingVertical: space.md, marginTop: space.xs },
  removeText: { color: colors.danger, fontSize: 15, fontFamily: font.semibold },
});
