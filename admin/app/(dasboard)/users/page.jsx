'use client';

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MoreHorizontal, ShieldAlert, UserCheck, UserX, UserSearch } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data for the users table
const mockUsers = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', role: 'Admin', status: 'Active', lastActive: '2 mins ago' },
    { id: '2', name: 'Bob Jones', email: 'bob.j@example.com', role: 'User', status: 'Offline', lastActive: '5 hours ago' },
    { id: '3', name: 'Charlie Davis', email: 'charlie.d@example.com', role: 'Moderator', status: 'Active', lastActive: 'Just now' },
    { id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'User', status: 'Away', lastActive: '1 day ago' },
    { id: '5', name: 'Evan Wright', email: 'evan@example.com', role: 'User', status: 'Active', lastActive: '10 mins ago' },
    { id: '6', name: 'Fiona Gallagher', email: 'fiona@example.com', role: 'User', status: 'Suspended', lastActive: '2 weeks ago' },
    { id: '7', name: 'George Harrison', email: 'george@example.com', role: 'User', status: 'Offline', lastActive: '3 days ago' },
    { id: '8', name: 'Hannah Abbott', email: 'hannah@example.com', role: 'Moderator', status: 'Active', lastActive: '1 hour ago' },
];

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = mockUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Offline': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
            case 'Away': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Suspended': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getStatusDot = (status) => {
        switch (status) {
            case 'Active': return 'bg-emerald-500';
            case 'Offline': return 'bg-zinc-500';
            case 'Away': return 'bg-amber-500';
            case 'Suspended': return 'bg-rose-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-foreground text-background p-6 md:p-8 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-background flex items-center gap-2">
                        <UserSearch className="w-8 h-8 text-indigo-400" />
                        Users Management
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage user accounts, roles, and platform access.
                    </p>
                </div>
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search users..."
                            className="w-full bg-background/5 border-background/20 text-background placeholder:text-muted-foreground pl-9 focus-visible:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                        Invite User
                    </Button>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="bg-background/5 border-background/10 backdrop-blur-md text-background flex-1 overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b border-background/10 pb-4">
                    <CardTitle className="text-background">All Users</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Showing {filteredUsers.length} of {mockUsers.length} total users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-[calc(100vh-280px)] w-full relative">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background/5 backdrop-blur-xl z-10">
                                <TableRow className="border-background/10 hover:bg-transparent">
                                    <TableHead className="text-muted-foreground font-medium pl-6">User</TableHead>
                                    <TableHead className="text-muted-foreground font-medium">Role</TableHead>
                                    <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                                    <TableHead className="text-muted-foreground font-medium">Last Active</TableHead>
                                    <TableHead className="text-right pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="border-background/5 hover:bg-background/10 transition-colors group">
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-sm font-semibold text-indigo-300 border border-indigo-500/30 shadow-inner">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium leading-none text-background mb-1">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className={`text-xs font-medium ${user.role === 'Admin' ? 'text-purple-400' : user.role === 'Moderator' ? 'text-sky-400' : 'text-slate-400'}`}>
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className={`font-normal rounded-full ${getStatusColor(user.status)}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(user.status)} mr-1.5 shadow-[0_0_8px_currentColor]`}></span>
                                                    {user.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground py-4">
                                                {user.lastActive}
                                            </TableCell>
                                            <TableCell className="text-right py-4 pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-background/20 text-muted-foreground hover:text-background">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-foreground border-background/20 text-background shadow-xl">
                                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem className="cursor-pointer hover:bg-background/10 focus:bg-background/10 focus:text-background">
                                                            View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="cursor-pointer hover:bg-background/10 focus:bg-background/10 focus:text-background">
                                                            Edit Role
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-background/10" />
                                                        <DropdownMenuItem className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400">
                                                            Suspend User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                            No users found matching "{searchTerm}"
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}