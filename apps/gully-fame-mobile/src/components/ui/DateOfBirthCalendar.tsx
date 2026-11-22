import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Same brown + orange palette as the Account Center screen.
const C = {
  card: "#1A1A1A",
  cardBorder: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  disabled: "#555",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MIN_YEAR = 1920;

type Props = {
  visible: boolean;
  /** Current value in DD/MM/YYYY form (may be empty). */
  value: string;
  onClose: () => void;
  /** Called with the chosen date in DD/MM/YYYY form. */
  onSelect: (value: string) => void;
};

type Ymd = { y: number; m: number; d: number };

function parseDob(value: string): Ymd | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[3]);
  const m = Number(match[2]) - 1;
  const d = Number(match[1]);
  const check = new Date(y, m, d);
  if (check.getFullYear() !== y || check.getMonth() !== m || check.getDate() !== d) return null;
  return { y, m, d };
}

const pad = (n: number) => String(n).padStart(2, "0");
const formatDob = ({ y, m, d }: Ymd) => `${pad(d)}/${pad(m + 1)}/${y}`;

/** Month-grid calendar in a bottom-free modal. Future dates are disabled; tap a year to jump to it. */
export default function DateOfBirthCalendar({ visible, value, onClose, onSelect }: Props) {
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [viewYear, setViewYear] = useState(todayY - 18);
  const [viewMonth, setViewMonth] = useState(todayM);
  const [selected, setSelected] = useState<Ymd | null>(null);
  const [mode, setMode] = useState<"days" | "years">("days");

  // Reset to the saved date (or a sensible default) each time the calendar opens.
  useEffect(() => {
    if (!visible) return;
    const parsed = parseDob(value);
    const base = parsed ?? { y: todayY - 18, m: todayM, d: todayD };
    setViewYear(base.y);
    setViewMonth(base.m);
    setSelected(parsed);
    setMode("days");
  }, [visible, value, todayY, todayM, todayD]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isFuture = (day: number) =>
    new Date(viewYear, viewMonth, day).getTime() > new Date(todayY, todayM, todayD).getTime();

  const atCurrentMonth = viewYear === todayY && viewMonth === todayM;

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (atCurrentMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const years: number[] = [];
  for (let y = todayY; y >= MIN_YEAR; y--) years.push(y);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goPrevMonth}
              disabled={mode === "years"}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Text style={[styles.navText, mode === "years" && styles.disabledText]}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode((m) => (m === "days" ? "years" : "days"))}
              style={styles.titleBtn}
              accessibilityRole="button"
              accessibilityLabel="Choose year"
            >
              <Text style={styles.title}>
                {mode === "days" ? `${MONTHS[viewMonth]} ${viewYear}` : "Select year"} ▾
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goNextMonth}
              disabled={mode === "years" || atCurrentMonth}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Text style={[styles.navText, (mode === "years" || atCurrentMonth) && styles.disabledText]}>›</Text>
            </TouchableOpacity>
          </View>

          {mode === "days" ? (
            <>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w, i) => (
                  <Text key={i} style={styles.weekday}>{w}</Text>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={i} style={styles.cell} />;
                  const disabled = isFuture(day);
                  const isSelected =
                    !!selected && selected.y === viewYear && selected.m === viewMonth && selected.d === day;
                  return (
                    <TouchableOpacity
                      key={i}
                      disabled={disabled}
                      onPress={() => setSelected({ y: viewYear, m: viewMonth, d: day })}
                      style={[styles.cell, isSelected && styles.cellSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${MONTHS[viewMonth]} ${viewYear}`}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          disabled && styles.disabledText,
                          isSelected && styles.selectedText,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <ScrollView style={styles.yearList} contentContainerStyle={styles.yearGrid}>
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => {
                    setViewYear(y);
                    setMode("days");
                  }}
                  style={[styles.yearCell, y === viewYear && styles.cellSelected]}
                >
                  <Text style={[styles.yearText, y === viewYear && styles.selectedText]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.okBtn, !selected && styles.okBtnDisabled]}
              disabled={!selected}
              onPress={() => selected && onSelect(formatDob(selected))}
              activeOpacity={0.7}
            >
              <Text style={styles.okText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    color: C.accent,
    fontSize: 26,
    lineHeight: 28,
    fontFamily: "Inter_500Medium",
  },
  titleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  title: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: C.faint,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    paddingVertical: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  cellSelected: {
    backgroundColor: C.accent,
  },
  dayText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  selectedText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  disabledText: {
    color: C.disabled,
  },
  yearList: {
    maxHeight: 320,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  yearCell: {
    width: "31%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: C.accentSoft,
  },
  yearText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    backgroundColor: "#252525",
  },
  cancelText: {
    color: C.muted,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  okBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: C.accent,
  },
  okBtnDisabled: {
    backgroundColor: C.disabled,
  },
  okText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
