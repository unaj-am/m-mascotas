import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthActions } from '../../../../composition/application-provider';
import { FormMessage } from '../../../../core/ui/auth-card';
import { useAuthOperation } from '../../../auth/presentation/hooks/use-auth-operation';
import { DashboardIcon, type DashboardIconName } from './dashboard-icon';
import { createDashboardStyles, dashboardColors } from './dashboard.styles';

type Variant = keyof typeof dashboardColors;
export type DashboardTab<T extends string> = Readonly<{ id: T; label: string; icon: DashboardIconName }>;
const styles = { owner: createDashboardStyles(dashboardColors.owner), walker: createDashboardStyles(dashboardColors.walker) };

export function DashboardAvatar({ name, uri, variant }: { name: string; uri: string | null; variant: Variant }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const s = styles[variant];
  return <View style={s.profileAvatar}>
    {uri && failedUri !== uri ? <Image source={{ uri }} accessibilityLabel="Foto de perfil" style={s.image} onError={() => setFailedUri(uri)} />
      : <Text style={s.profileInitial}>{name.charAt(0).toLocaleUpperCase() || (variant === 'walker' ? 'P' : 'D')}</Text>}
  </View>;
}

export function DashboardShell<T extends string>({ variant, tabs, activeTab, onTabChange, name, profileImage, title, subtitle, loading, refreshDisabled = false, onRefresh, children }: {
  variant: Variant; tabs: readonly DashboardTab<T>[]; activeTab: T; onTabChange: (tab: T) => void;
  name: string; profileImage: string | null; title: string; subtitle: string; loading: boolean;
  refreshDisabled?: boolean; onRefresh: () => void; children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const desktop = width >= 1080;
  const s = styles[variant];
  const colors = dashboardColors[variant];
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const auth = useAuthActions();
  const operation = useAuthOperation();
  const home = activeTab === 'home';
  const profileTab = tabs.find((tab) => tab.id === 'profile');
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: true }); }, [activeTab]);
  const logout = () => { if (auth) void operation.run(() => auth.signOut()); };
  const navigate = (tab: T) => { onTabChange(tab); };
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    {desktop && <View style={s.header}><View style={s.headerInner}>
      <View style={s.brand}><View style={s.brandIcon}><DashboardIcon name="paw" color={colors.white} size={23} /></View><Text style={s.brandName}>Mascotas</Text></View>
      <View style={s.nav}>{tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="button" accessibilityState={{ selected: tab.id === activeTab }}
        onPress={() => navigate(tab.id)} style={[s.navButton, tab.id === activeTab && s.navSelected]}>
        <DashboardIcon name={tab.icon} color={tab.id === activeTab ? colors.primary : colors.muted} size={17} />
        <Text style={[s.navLabel, tab.id === activeTab && s.navLabelSelected]}>{tab.label}</Text>
      </Pressable>)}</View>
      <View style={s.account}><Pressable accessibilityRole="button" accessibilityLabel="Ver mi perfil" disabled={!profileTab} onPress={() => { if (profileTab) navigate(profileTab.id); }} style={s.account}>
        <View style={s.avatar}><Text style={s.avatarText}>{name.charAt(0).toLocaleUpperCase() || (variant === 'walker' ? 'P' : 'D')}</Text></View>
        <View><Text numberOfLines={1} style={[s.accountName, { maxWidth: 100 }]}>{name || 'Mi cuenta'}</Text><Text style={s.roleLabel}>{variant === 'walker' ? 'Paseador' : 'Dueño'}</Text></View></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" disabled={!auth || operation.busy} accessibilityState={{ disabled: !auth || operation.busy, busy: operation.busy }}
          onPress={logout} style={s.logoutButton}>{operation.busy ? <ActivityIndicator color={colors.primary} /> : <DashboardIcon name="logout" color={colors.primary} />}<Text style={s.logoutText}>Salir</Text></Pressable>
      </View>
    </View></View>}
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={s.scroll} contentContainerStyle={[s.content, compact && s.contentCompact]}>
      <View style={s.introduction}>
        {home && <DashboardAvatar name={name} uri={profileImage} variant={variant} />}
        <View style={{ flex: 1 }}>{home && <Text style={s.eyebrow}>{variant === 'walker' ? 'PANEL DE PASEADOR' : 'HOLA DE NUEVO'}</Text>}
          <Text accessibilityRole="header" numberOfLines={home ? 1 : undefined} style={[s.heading, compact && s.headingCompact]}>{title}</Text>
          <Text style={[s.subtitle, compact && s.subtitleCompact]}>{subtitle}</Text>
        </View>
        {home ? <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Notificaciones. Disponibles próximamente." style={[s.refresh, s.unavailable]}>
          <DashboardIcon name="bell" color={colors.primary} size={23} />
        </Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Actualizar mis datos" disabled={loading || refreshDisabled} onPress={onRefresh} style={s.refresh}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <DashboardIcon name="refresh" color={colors.primary} size={24} />}
        </Pressable>}
      </View>
      {operation.message && <View style={s.error}><FormMessage message={operation.message} error={operation.isError} /></View>}
      {children}
      {activeTab === 'profile' && <Pressable accessibilityRole="button" disabled={!auth || operation.busy} accessibilityState={{ disabled: !auth || operation.busy, busy: operation.busy }} onPress={logout}
        style={[s.button, s.primary, operation.busy && s.muted]}>{operation.busy && <ActivityIndicator color={colors.white} />}<Text style={s.primaryText}>{operation.busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text></Pressable>}
      {home && !loading && <View style={s.footer}><Pressable accessibilityRole="button" disabled={refreshDisabled} onPress={onRefresh} style={[s.textLink, refreshDisabled && s.muted]}>
        <Text style={s.textLinkLabel}>Actualizar mi actividad</Text><DashboardIcon name="refresh" color={colors.primary} size={18} />
      </Pressable></View>}
    </ScrollView>
    {!desktop && <View style={s.bottomNav}>{tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: tab.id === activeTab }}
      onPress={() => navigate(tab.id)} style={[s.bottomItem, tab.id === activeTab && s.navSelected]}>
      <DashboardIcon name={tab.icon} size={21} color={tab.id === activeTab ? colors.primary : colors.muted} /><Text style={[s.bottomLabel, tab.id === activeTab && s.navLabelSelected]}>{tab.label}</Text>
    </Pressable>)}</View>}
  </SafeAreaView>;
}
