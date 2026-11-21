import { useEffect, useState } from 'react';
import { FirebaseConfigurationError } from '../core/errors/firebase-configuration-error';
import type { Application } from './create-application';
import { startupErrorMessage, unsupported } from './startup-environment';

export function useApplicationBootstrap() {
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (unsupported) return;
    let active = true;
    setError(null);
    import('./create-platform-application')
      .then(({ createPlatformApplication }) => { if (active) setApplication(createPlatformApplication()); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof FirebaseConfigurationError ? cause.message : startupErrorMessage); });
    return () => { active = false; };
  }, [attempt]);
  return { application, error, unsupported, retry: () => setAttempt((value) => value + 1) };
}
