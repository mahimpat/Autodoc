'use client';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

export default function ResizableShell({ left, center, right }:{ left: React.ReactNode, center: React.ReactNode, right: React.ReactNode }) {
  return (
    <PanelGroup direction="horizontal" className="h-[75vh] rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-white/30 dark:bg-white/5">
      <Panel defaultSizePercentage={22} minSizePercentage={18}>
        <div className="h-full overflow-auto p-3">{left}</div>
      </Panel>
      <PanelResizeHandle className="w-1 bg-black/5 dark:bg-white/10" />
      <Panel defaultSizePercentage={56} minSizePercentage={40}>
        <div className="h-full overflow-auto p-3">{center}</div>
      </Panel>
      <PanelResizeHandle className="w-1 bg-black/5 dark:bg-white/10" />
      <Panel defaultSizePercentage={22} minSizePercentage={16}>
        <div className="h-full overflow-auto p-3">{right}</div>
      </Panel>
    </PanelGroup>
  );
}
