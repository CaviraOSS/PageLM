export default function ComingSoon() {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-white">
          More Tools Coming Soon
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent"></div>
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium">
          IN DEVELOPMENT
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* AI Study Planner */}
        <div className="group rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 opacity-70 hover:opacity-90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs uppercase tracking-wide text-blue-400 font-semibold">
                  study planner
                </div>
              </div>
              <div className="text-white font-semibold text-lg mb-2">
                AI Study Planner
              </div>
              <div className="text-zinc-400 text-sm leading-relaxed">
                Create personalized study schedules with AI-optimized spaced
                repetition and deadline management.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Mind Map Generator */}
        <div className="group rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 hover:border-pink-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/10 opacity-70 hover:opacity-90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs uppercase tracking-wide text-pink-400 font-semibold">
                  visual learning
                </div>
              </div>
              <div className="text-white font-semibold text-lg mb-2">
                Mind Map Generator
              </div>
              <div className="text-zinc-400 text-sm leading-relaxed">
                Convert complex topics into interactive visual mind maps with
                AI-generated connections and insights.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 text-pink-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Presentation Builder */}
        <div className="group rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 opacity-70 hover:opacity-90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs uppercase tracking-wide text-yellow-400 font-semibold">
                  presentation maker
                </div>
              </div>
              <div className="text-white font-semibold text-lg mb-2">
                Slide Builder Pro
              </div>
              <div className="text-zinc-400 text-sm leading-relaxed">
                Generate professional presentations with AI-designed slides,
                animations, and speaker notes.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1h-2a1 1 0 01-1-1v-1M7 4H5a1 1 0 00-1 1v14a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Voice Note Transcriber */}
        <div className="group rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 opacity-70 hover:opacity-90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs uppercase tracking-wide text-purple-400 font-semibold">
                  audio to text
                </div>
              </div>
              <div className="text-white font-semibold text-lg mb-2">
                Voice Note Transcriber
              </div>
              <div className="text-zinc-400 text-sm leading-relaxed">
                Convert lecture recordings and voice notes into organized,
                searchable study materials instantly.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Homework Planner */}
        <div className="group rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 hover:border-lime-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-lime-500/10 opacity-70 hover:opacity-90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs uppercase tracking-wide text-lime-400 font-semibold">
                  task manager
                </div>
              </div>
              <div className="text-white font-semibold text-lg mb-2">
                Smart Homework Planner
              </div>
              <div className="text-zinc-400 text-sm leading-relaxed">
                AI-powered assignment tracking with priority scheduling and
                deadline reminders.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-lime-500/20 to-green-500/20 border border-lime-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 text-lime-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 border border-zinc-600/50">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 animate-pulse"></div>
          <span className="text-zinc-300 text-sm font-medium">
            New tools launching every week
          </span>
        </div>
      </div>
    </div>
  );
}
