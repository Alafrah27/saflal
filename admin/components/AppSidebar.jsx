"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Settings } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
    {
        title: "Dashboard",
        url: "/home",
        icon: LayoutDashboard,
    },
    {
        title: "Users",
        url: "/users",
        icon: Users,
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar className="border-r bg-white dark:bg-card">
            {/* Header */}
            <SidebarHeader>
                <div className="flex items-center gap-3 p-4">
                    <img
                        src="/adaptive-icon.png"
                        alt="Luqya Logo"
                        className="w-10 h-10 rounded-md"
                    />
                    <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                        Luqya
                    </span>
                </div>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-muted-foreground px-4">
                        Menu
                    </SidebarGroupLabel>

                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                const isActive = pathname === item.url

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            className={`
                        rounded-lg transition-all
                        ${isActive
                                                    ? "bg-muted font-medium"
                                                    : "hover:bg-muted/60"}
                      `}
                                        >
                                            <Link href={item.url} className="flex items-center gap-2">
                                                <item.icon className="w-4 h-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className={`rounded-lg ${pathname === "/settings"
                                    ? "bg-muted font-medium"
                                    : "hover:bg-muted/60"
                                }`}
                        >
                            <Link href="/settings" className="flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}