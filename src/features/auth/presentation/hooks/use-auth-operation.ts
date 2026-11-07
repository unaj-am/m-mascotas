import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result } from '../../../../shared/types/result';

export function useAuthOperation() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async <T,>(work: () => Promise<Result<T>>, successMessage: string | null = null) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true); setMessage(null); setIsError(false);
    try {
      const result = await work();
      if (mounted.current) { setMessage(result.ok ? successMessage : result.error.message); setIsError(!result.ok); }
      return result.ok;
    } catch {
      if (mounted.current) { setMessage('No pudimos completar la operación. Intentá nuevamente.'); setIsError(true); }
      return false;
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  return { busy, message, isError, run };
}
