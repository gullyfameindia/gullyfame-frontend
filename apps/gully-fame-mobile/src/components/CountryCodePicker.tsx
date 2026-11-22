import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRIES, type Country } from "@/constants/countries";

/** Flag + dialling code button; tapping it opens a searchable country list. */
export default function CountryCodePicker({
  value,
  onChange,
  hasError = false,
  bare = false,
  dark = false,
}: {
  /** Light text for dark backgrounds. */
  dark?: boolean;
  value: Country;
  onChange: (country: Country) => void;
  hasError?: boolean;
  /** No border of its own, for use inside an OutlinedField. */
  bare?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.replace("+", "").startsWith(q) || c.iso.toLowerCase() === q
    );
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <TouchableOpacity
        style={bare ? styles.triggerBare : [styles.trigger, hasError && styles.triggerError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Country code ${value.name} ${value.dial}. Tap to change`}
        testID="country-code-picker"
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={[styles.dial, dark && { color: "#FFFFFF" }]}>{value.dial}</Text>
        <Ionicons name="chevron-down" size={16} color={dark ? "#EC9A15" : "#9A7B55"} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select country code</Text>
            <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color="#9A7B55" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code"
              placeholderTextColor="#A8A29E"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={results}
            keyExtractor={(c) => c.iso}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No country found</Text>}
            renderItem={({ item }) => {
              const selected = item.iso === value.iso;
              return (
                <TouchableOpacity
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => {
                    onChange(item);
                    close();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowDial}>{item.dial}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color="#EC9A15" /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 54,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E7D9C4",
    backgroundColor: "#FFFFFF",
  },
  triggerBare: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: "100%",
  },
  triggerError: {
    borderColor: "#DC2626",
  },
  flag: { fontSize: 17 },
  dial: { fontSize: 14, color: "#1F2937", fontFamily: "Inter_600SemiBold" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    maxHeight: "75%",
    backgroundColor: "#FFF9F1",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D6C7B0",
    marginBottom: 10,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, color: "#1F2937", fontFamily: "Inter_700Bold" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E7D9C4",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1F2937", fontFamily: "Inter_400Regular", paddingVertical: 0 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowSelected: { backgroundColor: "rgba(236, 154, 21, 0.12)" },
  rowFlag: { fontSize: 22 },
  rowName: { flex: 1, fontSize: 15, color: "#1F2937", fontFamily: "Inter_500Medium" },
  rowDial: { fontSize: 15, color: "#6B7280", fontFamily: "Inter_600SemiBold" },
  empty: { textAlign: "center", color: "#6B7280", paddingVertical: 24, fontFamily: "Inter_400Regular" },
});
