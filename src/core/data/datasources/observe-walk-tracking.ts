import { success } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { WalkLocation } from '../../domain/entities/location';
import type { WalkTracking } from '../../domain/entities/walk-tracking';
import type { Walk } from '../../domain/entities/walk';
import { toWalkLocation } from '../mappers/walk-location-mapper';
import { participant, trackingFailure } from '../mappers/walk-tracking-mapper';
import type { WalkLocationDataSource } from './walk-location-data-source';

export function observeWalkTracking(source: WalkLocationDataSource, uid: string, id: string, observer: Observer<WalkTracking>) {
  let active = true, walk: Walk | null = null, current: WalkLocation | null = null, history: readonly WalkLocation[] = [];
  let currentReady = false, historyReady = false, currentStop: (() => void) | null = null, historyStop: (() => void) | null = null;
  let mode: string | null = null, generation = 0, failed = false;
  const metadata = { walk: { fromCache: true, pendingWrites: false }, current: { fromCache: true, pendingWrites: false }, history: { fromCache: true, pendingWrites: false } };
  const stops = () => { generation++; currentStop?.(); historyStop?.(); currentStop = historyStop = null; };
  const emit = () => {
    if (!active || !walk || failed) return;
    const parts = [metadata.walk, ...(mode === 'IN_PROGRESS' ? [metadata.current, metadata.history] : mode === 'SCHEDULED' ? [] : [metadata.history])];
    observer(success({ walk, current, history, loadingLocations: mode !== 'SCHEDULED' && (!historyReady || (mode === 'IN_PROGRESS' && !currentReady)),
      fromCache: parts.some((part) => part.fromCache), pendingWrites: parts.some((part) => part.pendingWrites) }));
  };
  const error = (value: unknown) => { if (active) observer(trackingFailure(value)); };
  try {
    const stopWalk = source.observeWalk(uid, id, (snapshot) => {
      if (!active) return;
      if (snapshot.fromCache && snapshot.data === null) return;
      try {
        walk = participant(id, snapshot.data, uid); metadata.walk = snapshot;
        if (walk.status !== mode) {
          stops(); failed = false; mode = walk.status; current = null; history = []; currentReady = historyReady = false;
          const version = generation;
          const childError = (value: unknown) => { if (active && generation === version) { failed = true; stops(); error(value); } };
          if (mode !== 'SCHEDULED') {
            historyStop = source.observeHistory(uid, id, (value) => {
              if (!active || generation !== version) return;
              try { history = value.data.map(toWalkLocation).sort((a, b) => a.recordedAt - b.recordedAt); metadata.history = value; historyReady = true; emit(); }
              catch (value) { childError(value); }
            }, childError);
          }
          if (mode === 'IN_PROGRESS') currentStop = source.observeCurrent(uid, id, (value) => {
            if (!active || generation !== version) return;
            try { current = value.data === null ? null : toWalkLocation(value.data); metadata.current = value; currentReady = true; emit(); }
            catch (value) { childError(value); }
          }, childError);
        }
        emit();
      } catch (value) { failed = true; stops(); error(value); }
    }, error);
    return () => { active = false; stops(); stopWalk(); };
  } catch (value) { stops(); error(value); return () => { active = false; }; }
}
