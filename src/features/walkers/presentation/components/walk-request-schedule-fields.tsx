import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardColors } from '../../../../core/ui/dashboard.styles';
import { WalkRequestCalendar } from './walk-request-calendar';

type Choice = 'date' | 'time' | 'duration';
const colors = dashboardColors.owner;
const titles: Record<Choice, string> = { date: 'Elegí la fecha', time: 'Elegí el horario', duration: 'Elegí la duración' };
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const minutes = Array.from({ length: 60 }, (_, minute) => minute);
const presets = [15, 30, 45, 60, 90, 120];
const pad = (value: number) => String(value).padStart(2, '0');
const dateLabel = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

function NumberOptions({ label, values, selected, onSelect, format = String }: {
  label: string;
  values: readonly number[];
  selected: number;
  onSelect: (value: number) => void;
  format?: (value: number) => string;
}) {
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>
      {values.map((value) => {
        const checked = selected === value;
        return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${label}: ${format(value)}`}
          accessibilityState={{ checked }} onPress={() => onSelect(value)}
          style={[styles.option, checked && styles.selected]}>
          <Text style={[styles.optionText, checked && styles.selectedText]}>{format(value)}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export function WalkRequestScheduleFields({ date, time, duration, disabled, onDate, onTime, onDuration }: {
  date: Date | null;
  time: string;
  duration: number;
  disabled: boolean;
  onDate: (value: Date) => void;
  onTime: (value: string) => void;
  onDuration: (value: number) => void;
}) {
  const [picker, setPicker] = useState<Choice | null>(null);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [customDuration, setCustomDuration] = useState(false);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const totalMinutes = hour * 60 + minute;

  function open(choice: Choice) {
    if (choice === 'time') {
      const [savedHour, savedMinute] = time.split(':').map(Number);
      setHour(time ? savedHour ?? 0 : 9);
      setMinute(time ? savedMinute ?? 0 : 0);
    }
    if (choice === 'duration') {
      setHour(Math.floor(duration / 60));
      setMinute(duration % 60);
      setCustomDuration(!presets.includes(duration));
    }
    setPicker(choice);
  }

  function close() { setPicker(null); }
  function selectDuration(value: number) { onDuration(value); close(); }

  const fields: { id: Choice; label: string; value: string }[] = [
    { id: 'date', label: 'Fecha', value: date ? dateLabel.format(date) : 'Seleccionar fecha' },
    { id: 'time', label: 'Hora local', value: time || 'Seleccionar hora' },
    { id: 'duration', label: 'Duración', value: `${duration} min` },
  ];

  return <>
    <View style={styles.fields}>
      {fields.map(({ id, label, value }) => <View key={id} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}
          accessibilityState={{ disabled, expanded: picker === id }} disabled={disabled} onPress={() => open(id)}
          style={[styles.trigger, disabled && styles.disabled]}>
          <Text style={styles.optionText}>{value}</Text>
          <Text accessible={false} style={styles.label}>⌄</Text>
        </Pressable>
      </View>)}
    </View>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>{picker && titles[picker]}</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            {picker === 'date' && <WalkRequestCalendar value={date} today={today} onSelect={(value) => { onDate(value); close(); }} />}
            {picker === 'time' && <>
              <NumberOptions label="Hora" values={hours} selected={hour} onSelect={setHour} format={pad} />
              <NumberOptions label="Minutos" values={minutes} selected={minute} onSelect={setMinute} format={pad} />
            </>}
            {picker === 'duration' && <>
              <NumberOptions label="Duraciones habituales" values={presets} selected={duration} onSelect={selectDuration} format={(value) => `${value} min`} />
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: customDuration }}
                onPress={() => setCustomDuration(!customDuration)} style={styles.option}>
                <Text style={styles.optionText}>Otra duración</Text>
              </Pressable>
              {customDuration && <>
                <NumberOptions label="Horas" values={[...hours, 24]} selected={hour}
                  onSelect={(value) => { setHour(value); if (value === 24) setMinute(0); }} />
                {hour < 24 && <NumberOptions label="Minutos" values={minutes} selected={minute} onSelect={setMinute} />}
              </>}
            </>}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={close} style={styles.option}><Text style={styles.optionText}>Cancelar</Text></Pressable>
            {picker === 'time' && <Pressable accessibilityRole="button"
              onPress={() => { onTime(`${pad(hour)}:${pad(minute)}`); close(); }} style={[styles.option, styles.selected]}>
              <Text style={styles.selectedText}>Usar {pad(hour)}:{pad(minute)}</Text>
            </Pressable>}
            {picker === 'duration' && customDuration && <Pressable accessibilityRole="button"
              accessibilityState={{ disabled: totalMinutes === 0 }} disabled={totalMinutes === 0}
              onPress={() => selectDuration(totalMinutes)} style={[styles.option, styles.selected, totalMinutes === 0 && styles.disabled]}>
              <Text style={styles.selectedText}>Usar {totalMinutes} min</Text>
            </Pressable>}
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexBasis: 160, flexGrow: 1, gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  trigger: { minHeight: 48, borderWidth: 1, borderColor: '#d6cddd', borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#21162c80', padding: 16 },
  dialog: { width: '100%', maxWidth: 460, maxHeight: '94%', backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { gap: 14 },
  group: { gap: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.container },
  optionText: { color: colors.ink, fontSize: 14 },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: colors.white, fontWeight: '700' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  disabled: { opacity: 0.5 },
});
