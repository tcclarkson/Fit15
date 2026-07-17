import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Today", icon: "🔥", end: true },
  { to: "/feed", label: "Feed", icon: "📣", end: false },
  { to: "/friends", label: "Friends", icon: "👥", end: false },
  { to: "/calendar", label: "History", icon: "📅", end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-orange-500"
                  : "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
