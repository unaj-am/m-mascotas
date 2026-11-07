import { Text, View } from 'react-native';

export type DashboardIconName = 'home' | 'paw' | 'calendar' | 'user' | 'arrow' | 'logout' | 'refresh' | 'check' | 'bell' | 'inbox';

export function DashboardIcon({ name, color = '#7051a5', size = 22 }: { name: DashboardIconName; color?: string; size?: number }) {
  const unit = size / 24;
  const shape = (left: number, top: number, width: number, height: number, radius = 0) => ({
    position: 'absolute' as const, left: left * unit, top: top * unit, width: width * unit, height: height * unit, borderRadius: radius * unit,
  });
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    {name === 'paw' ? <>
      <View style={[shape(5, 12, 14, 10, 7), { backgroundColor: color, transform: [{ rotate: '-8deg' }] }]} />
      {[[1, 7, -22], [6, 1, -8], [13, 1, 8], [18, 7, 22]].map(([left = 0, top = 0, angle = 0], index) =>
        <View key={index} style={[shape(left, top, 5, 7, 4), { backgroundColor: color, transform: [{ rotate: `${angle}deg` }] }]} />)}
    </> : name === 'bell' ? <>
      <View style={[shape(5, 4, 14, 15, 8), { borderWidth: 1.7, borderColor: color }]} />
      <View style={[shape(3, 18, 18, 2, 1), { backgroundColor: color }]} />
      <View style={[shape(10, 21, 4, 2, 1), { backgroundColor: color }]} />
    </> : name === 'inbox' ? <>
      <View style={[shape(3, 4, 18, 17, 3), { borderWidth: 1.7, borderColor: color }]} />
      <View style={[shape(3, 14, 6, 1), { backgroundColor: color }]} />
      <View style={[shape(15, 14, 6, 1), { backgroundColor: color }]} />
      <View style={[shape(8, 14, 8, 3, 2), { borderWidth: 1.5, borderTopWidth: 0, borderColor: color }]} />
    </> : name === 'calendar' ? <>
      <View style={[shape(3, 5, 18, 17, 4), { borderWidth: 1.7, borderColor: color }]} />
      <View style={[shape(3, 10, 18, 1), { backgroundColor: color }]} />
      {[7, 16].map((left) => <View key={left} style={[shape(left, 2, 2, 6, 1), { backgroundColor: color }]} />)}
      <View style={[shape(7, 14, 4, 4, 1), { backgroundColor: color }]} />
    </> : name === 'user' ? <>
      <View style={[shape(8, 2, 8, 8, 5), { borderWidth: 1.7, borderColor: color }]} />
      <View style={[shape(3, 14, 18, 8, 8), { borderWidth: 1.7, borderColor: color }]} />
    </> : name === 'home' ? <>
      <View style={[shape(5, 9, 14, 12, 2), { borderWidth: 1.7, borderColor: color }]} />
      <View style={[shape(6, 3, 12, 12, 2), { borderLeftWidth: 1.7, borderTopWidth: 1.7, borderColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[shape(10, 14, 4, 7, 1), { backgroundColor: color }]} />
    </> : <Text style={{ color, fontSize: size, lineHeight: size, textAlign: 'center', fontWeight: '500' }}>
      {({ arrow: '↗', logout: '↪', refresh: '↻', check: '✓' } as const)[name]}
    </Text>}
  </View>;
}
