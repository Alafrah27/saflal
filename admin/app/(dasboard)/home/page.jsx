import { UserSearch } from "lucide-react"

function DashboardPage() {
    return (
        <div className="flex flex-col min-h-screen bg-foreground text-background p-6 md:p-8 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
                <div className="flex items-center gap-2">
                    <UserSearch className="w-8 h-8 text-indigo-400" />
                    <div className="flex flex-col">

                        <h1 className="text-3xl font-bold tracking-tight text-background flex items-center gap-2">

                            Good Morning, Alice!
                        </h1>
                        <p className="text-background/70 text-md mt-1">
                            Here's what's happening with your platform today.
                        </p>
                    </div>
                </div>

            </div>
        </div >
    )
}

export default DashboardPage