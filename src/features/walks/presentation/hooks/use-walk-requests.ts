import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppError, Result } from '../../../../shared/types/result';
import type { Page } from '../../../../shared/types/page';
import type { WalkRequest } from '../../../../core/domain/entities/walk-request';
import type { WalkUseCases } from '../../../../core/domain/use-cases/walk-use-cases';

type State = { status: 'loading' } | { status: 'error'; error: AppError } |
  { status: 'success'; page: Page<WalkRequest> };

export function useWalkRequests(cases: WalkUseCases, uid: string, side: 'owner' | 'walker') {
  const [state, setState] = useState<State>({ status: 'loading' });
  const generation = useRef(0);
  const load = useCallback(async (cursor: string | null = null) => {
    const current = ++generation.current;
    setState({ status: 'loading' });
    const result = await cases.listRequests(side, cursor);
    if (current === generation.current) setState(result.ok
      ? { status: 'success', page: result.value } : { status: 'error', error: result.error });
  }, [cases, side, uid]);
  useEffect(() => {
    void load();
    return () => { generation.current++; };
  }, [load]);

  return {
    state, reload: load,
    async act(action: 'accept' | 'reject' | 'cancel' | 'delete', id: string): Promise<Result<unknown>> {
      const current = generation.current;
      const result = await ({
        accept: cases.acceptRequest, reject: cases.rejectRequest,
        cancel: cases.cancelRequest, delete: cases.deleteRequest,
      }[action])(id);
      if (current === generation.current && result.ok) await load();
      return result;
    },
  };
}
