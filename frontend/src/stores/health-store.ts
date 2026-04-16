// ---------------------------------------------------------------------------
// Health Store — tracks backend service connectivity (not persisted)
// ---------------------------------------------------------------------------

import { create } from 'zustand';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastChecked: number;
  responseTimeMs?: number;
  version?: string;
  environment?: string;
}

export interface HealthStore {
  services: ServiceHealth[];
  isConnected: boolean;

  setServiceHealth: (name: string, patch: Partial<ServiceHealth>) => void;
  setConnected: (connected: boolean) => void;
}

const INITIAL_SERVICES: ServiceHealth[] = [
  { name: 'api-gateway', status: 'unknown', lastChecked: 0 },
  { name: 'model-service', status: 'unknown', lastChecked: 0 },
  { name: 'worker-service', status: 'unknown', lastChecked: 0 },
];

export const useHealthStore = create<HealthStore>()((set) => ({
  services: INITIAL_SERVICES,
  isConnected: false,

  setServiceHealth: (name, patch) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.name === name ? { ...s, ...patch, lastChecked: Date.now() } : s,
      ),
    })),

  setConnected: (isConnected) => set({ isConnected }),
}));
