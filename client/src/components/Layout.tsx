import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-neutral-50 dark:bg-neutral-950">
      <TopBar />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
