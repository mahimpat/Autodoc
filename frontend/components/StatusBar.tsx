export default function StatusBar({ live }: { live: boolean }) {
  return (
    <div className="text-xs text-gray-500 flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {live ? 'Streaming' : 'Idle'}
    </div>
  );
}
