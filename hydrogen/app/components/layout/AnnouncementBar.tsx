interface AnnouncementBarProps {
  messages?: string[];
}

export function AnnouncementBar({ messages = [] }: AnnouncementBarProps) {
  if (messages.length === 0) return null;
  return (
    <div className="bg-crimson text-crimson-foreground">
      <div className="relative flex items-center overflow-hidden px-4 py-2 text-xs sm:text-sm">
        <div className="flex animate-[marquee_30s_linear_infinite] gap-12 whitespace-nowrap font-medium tracking-wide">
          {[...messages, ...messages].map((m, i) => (
            <span key={i}>★ {m}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
