import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';
import { createSessionStore, type SessionStore } from '../features/auth/presentation/state/session-store';
import type { Application } from './create-application';

const Context = createContext<{ store: SessionStore; application: Application | null } | null>(null);
export function ApplicationProvider({ children, application = null }: PropsWithChildren<{ application?: Application | null }>) {
  const [store] = useState(createSessionStore);
  useEffect(() => {
    if (!application) {
      store.setState({ session: { status: 'unconfigured' } });
      return;
    }
    let active = true;
    store.setState({ session: { status: 'loading' } });
    const unsubscribe = application.observeSession((result) => {
      if (active) store.setState({ session: result.ok ? result.value : { status: 'error', error: result.error } });
      if (!result.ok || result.value.status === 'signed-out' || result.value.status === 'needs-verification' || (result.value.status === 'authenticated' && result.value.role !== 'WALKER')) void application.tracking?.stopAll();
    });
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active' && store.getState().session.status !== 'signed-out') void application.auth.refreshSession();
    });
    return () => {
      active = false;
      foreground.remove();
      unsubscribe();
      store.setState({ session: { status: 'unconfigured' } });
    };
  }, [application, store]);
  return <Context.Provider value={{ store, application }}>{children}</Context.Provider>;
}
function useApplicationContext() {
  const context = useContext(Context);
  if (!context) throw new Error('Falta ApplicationProvider.');
  return context;
}
export function useSession() {
  const { store } = useApplicationContext();
  return useStore(store, (state) => state.session);
}
export function useAuthActions() { return useApplicationContext().application?.auth ?? null; }
export function useGetOwnerDashboard() { return useApplicationContext().application?.getOwnerDashboard ?? null; }
export function useWalkerDashboardActions() { return useApplicationContext().application?.walkerDashboard ?? null; }
export function usePetActions() { return useApplicationContext().application?.pets ?? null; }
export function useWalkBookingActions() { return useApplicationContext().application?.booking ?? null; }
export function useWalkExecutionActions() { return useApplicationContext().application?.walkExecution ?? null; }
export function useWalkTrackingActions() { return useApplicationContext().application?.tracking ?? null; }
