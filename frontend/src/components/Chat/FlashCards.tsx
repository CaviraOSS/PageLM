import type { FlashCard } from "../../lib/api";

type Props = {
  items?: FlashCard[];
  onAdd: (item: { kind: "flashcard" | "note"; title: string; content: string }) => void;
};

export default function FlashCards({ items = [], onAdd }: Props) {
  return (
    <div className="w-1/4 border-l border-zinc-900 pl-6 hidden lg:block">
      <div className="sticky top-24 h-[calc(100vh-6rem)] flex flex-col">
        <div className="mb-5">
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-900 px-4 py-3 flex items-center justify-between">
            <h3 className="text-zinc-100 font-semibold tracking-wide">Important Topics</h3>
            <span className="text-xs text-zinc-400">{items.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 custom-scroll space-y-4">
          {items.length === 0 ? (
            <div className="text-zinc-400 text-sm bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 text-center">
              No flashcards yet
            </div>
          ) : (
            items.map((c, i) => {
              const title = c.q;
              const content = c.a;
              return (
                <div
                  key={`${i}-${title}`}
                  className="group rounded-2xl bg-zinc-950/80 border border-zinc-900 hover:bg-zinc-900/80 transition-colors shadow-[0_6px_24px_rgba(0,0,0,0.35)]"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-zinc-50 text-sm font-medium leading-5 truncate">
                          {title}
                        </h4>
                        <p className="text-zinc-400 text-xs leading-5 mt-1 line-clamp-3">
                          {content}
                        </p>
                      </div>
                      <button
                        onClick={() => onAdd({ kind: "flashcard", title, content })}
                        className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        aria-label="Add to bag"
                        title="Add to bag"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M19 12H5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}