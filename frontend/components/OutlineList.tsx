'use client';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDocStore } from '../store/useDocStore';

function Row({ id, index, text }: { id: string; index: number; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="px-3 py-2 rounded-lg bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 mb-2 flex items-center gap-2" {...attributes} {...listeners}>
      <span className="text-xs text-gray-400 select-none">≡</span>
      <span className="truncate">{text || `Section ${index+1}`}</span>
    </div>
  );
}

export default function OutlineList() {
  const outline = useDocStore(s => s.outline);
  const reorder = useDocStore(s => s.reorder);
  const sensors = useSensors(useSensor(PointerSensor));
  if (!outline) return <div className="text-sm text-gray-500">No outline yet.</div>;
  const ids = outline.sections.map((_, i) => `sec-${i}`);
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e=>{
      const {active, over} = e;
      if (!over || active.id===over.id) return;
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      reorder(from, to);
    }}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {outline.sections.map((s, i) => <Row key={ids[i]} id={ids[i]} index={i} text={s.heading||''} />)}
      </SortableContext>
    </DndContext>
  );
}
