import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { createDashboardStyles, dashboardColors } from './dashboard.styles';

type Variant = keyof typeof dashboardColors;
const styles = { owner: createDashboardStyles(dashboardColors.owner), walker: createDashboardStyles(dashboardColors.walker) };

export function DashboardAvatar({ name, uri, variant }: { name: string; uri: string | null; variant: Variant }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const s = styles[variant];
  return <View style={s.profileAvatar}>
    {uri && failedUri !== uri ? <Image source={{ uri }} accessibilityLabel="Foto de perfil" style={s.image} onError={() => setFailedUri(uri)} />
      : <Text style={s.profileInitial}>{name.charAt(0).toLocaleUpperCase() || (variant === 'walker' ? 'P' : 'D')}</Text>}
  </View>;
}
