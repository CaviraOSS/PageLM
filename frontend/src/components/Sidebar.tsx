import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getChats } from "../lib/api";

interface Chat {
  id: string;
  title?: string;
}

interface ChatsResponse {
  chats: Chat[];
}

export default function Sidebar() {
  const p = useLocation().pathname
  const [isToggled, setIsToggled] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('pagelm:nav-collapsed')
      if (saved !== null) return saved === '1'
    } catch { }
    return typeof window !== 'undefined' && window.innerWidth < 1024
  })
  const [chats, setChats] = useState<ChatsResponse | null>(null);

  useEffect(() => {
    try { localStorage.setItem('pagelm:nav-collapsed', isCollapsed ? '1' : '0') } catch { }
    document.documentElement.classList.toggle('nav-collapsed', isCollapsed)
  }, [isCollapsed]);

  useEffect(() => {
    if (isToggled) {
      getChats().then(data => setChats(data));
    }
  }, [isToggled]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isToggled) setIsToggled(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isToggled]);

  const isChat = p === '/' || p === '/chat' || p.startsWith('/chat/');
  const isSources = p === '/sources' || p.startsWith('/sources/');
  const isStudio = p === '/studio' || p.startsWith('/studio/');
  const cls = (active: boolean) => `relative p-2.5 rounded-2xl duration-300 transition-all ${active ? 'text-white bg-stone-800 shadow-inner shadow-black/40' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'}`;
  const chatButtonClass = `p-2.5 rounded-2xl duration-300 transition-all ${isToggled ? 'text-white bg-stone-800' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'}`;

  const collapseNav = () => {
    setIsToggled(false);
    setIsCollapsed(true);
  };

  return (
    <>
      {isToggled && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsToggled(false)}
          aria-hidden="true"
        />
      )}

      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 h-16 w-8 items-center justify-center rounded-r-2xl border border-l-0 border-stone-800 bg-stone-950/95 text-stone-300 shadow-xl shadow-black/40 transition-colors hover:bg-stone-900 hover:text-white"
          title="إظهار القائمة"
          aria-label="إظهار القائمة"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      <aside className={`left-0 bottom-0 w-screen md:w-fit md:h-screen fixed p-4 z-50 lg:flex transition-transform duration-300 ease-out ${isCollapsed ? 'md:-translate-x-full' : ''}`}>
        <div
          id='idk'
          className={`w-72 md:order-2 h-full z-40 rounded-l-none rounded-2xl bg-stone-950 border border-l-transparent border-stone-900 ${
            isToggled ? 'flex' : 'hidden'
          } flex-col p-4 space-y-3 overflow-y-auto custom-scroll shadow-2xl transition-all duration-200`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-200 tracking-wide uppercase">Chat History</span>
              {chats?.chats && (
                <span className="text-[10px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded-full border border-stone-800">
                  {chats.chats.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsToggled(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-900 transition-colors"
              title="Close history (Esc)"
              aria-label="Close chat history"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {chats === null ? (
              <p className="text-xs text-stone-500 text-center py-6">Loading…</p>
            ) : chats.chats.length ? (
              chats.chats.map((chat) => (
                <Link
                  key={chat.id}
                  to={`/chat/?chatId=${chat.id}`}
                  onClick={() => setIsToggled(false)}
                  className="p-2.5 hover:text-stone-100 hover:bg-stone-900/90 rounded-xl block text-sm truncate border border-transparent hover:border-stone-800 transition-colors"
                >
                  {chat.title || "Untitled Chat"}
                </Link>
              ))
            ) : (
              <p className="text-xs text-stone-500 text-center py-6">No previous chats</p>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800">
            <Link
              to="/sources"
              onClick={() => setIsToggled(false)}
              className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              إدارة المصادر
            </Link>
          </div>
        </div>

        <div
          id='idk0'
          className={`md:w-20 md:order-1 h-full rounded-3xl ${
            isToggled ? 'md:rounded-r-none' : ''
          } bg-stone-950/50 backdrop-blur-xl border border-stone-900 text-stone-400 flex flex-col items-center justify-between py-4 z-40`}
        >
          <Link to="/" className="hidden md:block" aria-label="PageLM">
            <img src='/logo.png' alt='logo' className='w-10 h-auto rounded-full' />
          </Link>

          <nav className='flex md:flex-col items-center gap-3 md:gap-3 my-auto'>
            <Link to='/sources' className={cls(isSources)} title="المصادر" aria-label="المصادر">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              <span className="sr-only">المصادر</span>
            </Link>

            <Link to='/' className={cls(isChat)} title="المحادثة" aria-label="المحادثة">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h6.75M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
              <span className="sr-only">المحادثة</span>
            </Link>

            <Link to='/studio' className={cls(isStudio)} title="الاستوديو" aria-label="الاستوديو">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
              <span className="sr-only">الاستوديو</span>
            </Link>
          </nav>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={collapseNav}
              className={`hidden md:inline-flex ${chatButtonClass}`}
              aria-label="إخفاء القائمة"
              title="إخفاء القائمة"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setIsToggled(prev => !prev)}
              className={chatButtonClass}
              aria-label="Toggle chat history"
              title="سجل المحادثات"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
