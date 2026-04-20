import type { Metadata } from "next"
import { TopBar } from "@/components/layout/top-bar"
import { ProjectSidebar } from "@/components/layout/project-sidebar"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-background p-6" style={{ scrollbarGutter: "stable" }}>
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}
