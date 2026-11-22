import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dashboardColors } from '../../../../core/ui/dashboard.styles';

const colors = dashboardColors.owner;
const weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const fullDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' });
const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });

export function WalkRequestCalendar({ value, today, onSelect }: {
  value: Date | null;
  today: Date;
  onSelect: (date: Date) => void;
}) {
  const minimumMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const initial = value && value >= today ? value : today;
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstColumn = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Math.ceil((firstColumn + daysInMonth) / 7) * 7;
  const atMinimum = month <= minimumMonth;

  return <View style={styles.calendar}>
    <View style={styles.heading}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" accessibilityState={{ disabled: atMinimum }}
        disabled={atMinimum} onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}
        style={[styles.arrow, atMinimum && styles.unavailable]}><Text style={styles.arrowText}>‹</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.month}>{monthName.format(month)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente"
        onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable>
    </View>
    <View style={styles.grid}>
      {weekdays.map((day) => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}
      {Array.from({ length: cells }, (_, index) => {
        const day = index - firstColumn + 1;
        if (day < 1 || day > daysInMonth) return <View key={index} style={styles.cell} />;
        const date = new Date(year, monthIndex, day);
        const disabled = date < today;
        const selected = date.getTime() === value?.getTime();
        return <View key={index} style={styles.cell}>
          <Pressable accessibilityRole="button" accessibilityLabel={fullDate.format(date)}
            accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onSelect(date)}
            style={[styles.day, selected && styles.selected, disabled && styles.unavailable]}>
            <Text style={[styles.dayText, selected && styles.selectedText]}>{day}</Text>
          </Pressable>
        </View>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  calendar: { gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  month: { color: colors.ink, fontSize: 16, fontWeight: '600', textAlign: 'center', flex: 1 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.container },
  arrowText: { color: colors.primary, fontSize: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 1 },
  weekday: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  day: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  dayText: { color: colors.ink, fontSize: 15 },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: colors.white, fontWeight: '700' },
  unavailable: { opacity: 0.4 },
});
