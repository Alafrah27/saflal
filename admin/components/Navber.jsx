"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

const logo = "/adaptive-icon.png"
const navLinks = [
    {
        title: "Home",
        href: "/",
    },
    {
        title: "Blog",
        href: "/blog",
    },

    {
        title: "Contact",
        href: "/contact",
    },
]

function Navber() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Toggle menu state
    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    // Close menu when a link is clicked
    const handleLinkClick = () => setIsMobileMenuOpen(false);

    return (
        <header className='flex items-center justify-between z-50 bg-foreground p-1 md:px-3 md:py-5 h-[60px] sticky top-0 '>
            <div className='flex items-center z-50' >
                <Image src={logo} alt="logo" width={100} height={100} />
                <h1 className='text-xl font-bold text-background'>Luqya</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className='hidden md:flex items-center '>
                <ul className='flex items-center gap-4'>
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + "/"));
                        return (
                            <li key={link.href}>
                                <Link href={link.href} className={cn("", isActive ? "text-primary" : "text-background")}>{link.title}</Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <div className='hidden md:flex items-center gap-4 ' >
                <Link href="/login" >
                    <Button variant="" size="lg" className='w-26'>
                        Login
                    </Button>
                </Link>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
                className='md:hidden flex items-center justify-center p-2 text-background z-50 mr-2'
                onClick={toggleMobileMenu}
                aria-label="Toggle mobile menu"
            >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>

            {/* Mobile Navigation Overlay */}
            <div
                className={cn(
                    'fixed inset-0 top-[60px] z-40 bg-foreground flex flex-col items-center pt-8 transition-transform duration-300 ease-in-out md:hidden',
                    isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                )}
            >
                <nav className='flex flex-col items-start w-full gap-8'>
                    <ul className='flex flex-col items-start gap-8 w-full text-lg'>
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + "/"));
                            return (
                                <li key={link.href} className='w-full border-b border-background/20 pb-4 text-start px-6'>
                                    <Link
                                        href={link.href}
                                        onClick={handleLinkClick}
                                        className={cn("block w-full font-medium transition-colors hover:text-primary", isActive ? "text-primary" : "text-background")}
                                    >
                                        {link.title}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>

                    <div className='w-full px-6 mt-4'>
                        <Link href="/login" onClick={handleLinkClick}>
                            <Button variant="default" className='w-full h-14 text-lg rounded-xl'>
                                Login
                            </Button>
                        </Link>
                    </div>
                </nav>
            </div>

        </header>
    )
}

export default Navber
