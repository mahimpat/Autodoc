'use client';
import { create } from 'zustand';

export type Section = { heading: string; summary?: string; content?: string; citations?: number[] };
export type Outline = { title: string; mode: string; sections: Section[] };

type State = {
  outline: Outline | null;
  activeIndex: number | null;
  setOutline: (o: Outline | null) => void;
  setActiveIndex: (i: number | null) => void;
  updateSection: (i: number, patch: Partial<Section>) => void;
  reorder: (from: number, to: number) => void;
  addCitation: (i: number, sid: number) => void;
};

export const useDocStore = create<State>((set, get) => ({
  outline: null,
  activeIndex: null,
  setOutline: (o) => set({ outline: o }),
  setActiveIndex: (i) => set({ activeIndex: i }),
  updateSection: (i, patch) => {
    const o = get().outline;
    if (!o) return;
    const sections = o.sections.map((s, idx) => idx===i ? { ...s, ...patch } : s);
    set({ outline: { ...o, sections } });
  },
  reorder: (from, to) => {
    const o = get().outline;
    if (!o) return;
    const sections = o.sections.slice();
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    set({ outline: { ...o, sections } });
  }
  ,
  addCitation: (i, sid) => {
    const o = get().outline;
    if (!o) return;
    const sections = o.sections.map((s, idx) => {
      if (idx !== i) return s;
      const cits = Array.from(new Set([...(s.citations||[]), sid]));
      return { ...s, citations: cits };
    });
    set({ outline: { ...o, sections } });
  }
}));
