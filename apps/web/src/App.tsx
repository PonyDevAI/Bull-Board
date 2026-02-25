import { Routes, Route, Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Workspaces } from "@/pages/Workspaces";
import { Board } from "@/pages/Board";
import { TaskDetail } from "@/pages/TaskDetail";

function Home() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bull Board</h2>
      <p className="text-slate-600">看板控制台 v0.1</p>
      <div className="flex gap-2">
        <Link to="/workspaces" className={buttonVariants()}>
          Workspaces
        </Link>
        <Link to="/board" className={buttonVariants({ variant: "outline" })}>
          看板
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-slate-800">
            Bull Board
          </Link>
          <nav className="flex gap-2">
            <Link to="/workspaces" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Workspaces
            </Link>
            <Link to="/board" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              看板
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/board" element={<Board />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </main>
    </div>
  );
}
