import { create } from 'zustand';

interface TrackState {
  orderId: string | null;
  sharing: boolean;
  needsPermission: boolean;
  version: number;
  set: (p: Partial<TrackState>) => void;
  retry: () => void;
}
export const useTracking = create<TrackState>((set) => ({
  orderId: null, sharing: false, needsPermission: false, version: 0,
  set: (p) => set(p),
  retry: () => set((s) => ({ version: s.version + 1 })),
}));
