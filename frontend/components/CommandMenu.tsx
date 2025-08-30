'use client';
import { useRegisterActions, KBarPortal, KBarPositioner, KBarAnimator, KBarSearch, KBarResults } from 'kbar';
import { useRouter } from 'next/navigation';

const results = (items: any[]) => items.map((it, i) => ({
  id: typeof it === 'string' ? `section-${i}` : it.id,
  name: typeof it === 'string' ? it : it.name,
  icon: typeof it === 'string' ? undefined : it.icon,
  perform: typeof it === 'string' ? undefined : it.perform,
}));

export default function CommandMenu() {
  const r = useRouter();
  useRegisterActions([
    { id: 'new', name: 'New Document', shortcut: ['n'], perform: () => r.push('/') },
    { id: 'upload', name: 'Upload Sources', shortcut: ['u'], perform: () => document.getElementById('file-input')?.click() },
    { id: 'generate', name: 'Generate', shortcut: ['g'], perform: () => (document.getElementById('btn-generate') as HTMLButtonElement)?.click() },
    { id: 'toggle-theme', name: 'Toggle Theme', shortcut: ['t'], perform: () => document.documentElement.classList.toggle('dark') },
  ], []);
  return (
    <KBarPortal>
      <KBarPositioner className="z-50 bg-black/40 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
          <KBarSearch className="w-full p-4 bg-transparent outline-none text-base" placeholder="Type a command…" />
          <KBarResults items={[]} onRender={({ item }) => <div>{typeof item === 'string' ? item : item.name}</div>} />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}
