// Global store (zustand) for the live, per-soldier data served by the API.
// Screens read dynamic data (soldier, stats, tonight, catalog, …) from here.
// Static presentation config (cats, moods, benefitFilters, wrapped copy) still
// comes from src/data. If the API is unreachable, we fall back to the static
// data module so the app stays fully usable offline.
import { create } from 'zustand';
import * as api from './api/client';
import * as staticData from './data';

const OFFLINE_SNAPSHOT = {
  soldier: staticData.soldier,
  stats: staticData.stats,
  tonight: staticData.tonight,
  catalog: staticData.catalog,
  benefits: staticData.benefits,
  titles: staticData.titles,
  vacation: staticData.vacation,
  activity: staticData.activity,
};

export const useStore = create((set, get) => ({
  loaded: false,
  online: false,
  ...OFFLINE_SNAPSHOT,

  // boot: get a session, load the snapshot. Fall back to static data offline.
  async bootstrap() {
    try {
      await api.ensureSession();
      const snap = await api.getState();
      set({ ...snap, loaded: true, online: true });
    } catch {
      set({ ...OFFLINE_SNAPSHOT, loaded: true, online: false });
    }
  },

  oppById: (id) => get().catalog.find((o) => o.id === id),

  // mutations — optimistic locally, reconciled with the server response.
  async toggleTonight(id) {
    set((s) => ({ tonight: s.tonight.map((q) => (q.id === id ? { ...q, done: !q.done } : q)) }));
    if (!get().online) return;
    try { const r = await api.toggleTonight(id); if (r.tonight) set({ tonight: r.tonight }); } catch { /* keep optimistic */ }
  },

  async toggleSubquest(oppId, subId, verified) {
    // optimistic flip in the local catalog
    set((s) => ({
      catalog: s.catalog.map((o) => o.id !== oppId ? o : {
        ...o,
        milestones: o.milestones.map((m) => ({
          ...m,
          subquests: m.subquests.map((q) => q.id !== subId ? q : { ...q, done: !q.done, verified: !q.done ? !!verified : false }),
        })),
      }),
    }));
    recomputeFill(set, get, oppId);
    if (!get().online) return;
    try { const r = await api.toggleSubquest(oppId, subId, verified); if (r.catalog) set({ catalog: r.catalog }); } catch { /* keep optimistic */ }
  },

  async checkin(mood, energy) {
    if (!get().online) return;
    try { const r = await api.checkin(mood, energy); if (r.snapshot) set({ ...r.snapshot }); } catch { /* ignore */ }
  },
}));

// keep an opportunity's fill% in sync after an optimistic local toggle
function recomputeFill(set, get, oppId) {
  set((s) => ({
    catalog: s.catalog.map((o) => {
      if (o.id !== oppId) return o;
      const all = o.milestones.flatMap((m) => m.subquests);
      const tot = all.reduce((a, q) => a + q.xp, 0) || 1;
      const got = all.filter((q) => q.done).reduce((a, q) => a + q.xp, 0);
      return { ...o, fill: Math.round((got / tot) * 100) };
    }),
  }));
}
