import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"

export default function Layout({ children }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 overflow-auto">
                <SidebarTrigger />
                {children}
            </main>
        </SidebarProvider>
    )
}