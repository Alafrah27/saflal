import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';

const logo = "/adaptive-icon.png";

export default function Footer() {
    return (
        <footer className="w-full bg-foreground text-background/80 pt-16 pb-8 border-t border-border/10 mt-auto">
            <div className="container mx-auto px-6 max-w-6xl">

                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Brand Section */}
                    <div className="flex flex-col items-start space-y-6 lg:border-r border-border/10 pr-6">
                        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
                            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/20 shadow-sm border border-primary/30">
                                <Image src={logo} alt="Luqya Logo" fill className="object-cover p-1" />
                            </div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-background">Luqya</h2>
                        </Link>
                        <p className="text-sm leading-relaxed text-background/60 max-w-xs">
                            Connecting people with what matters most. Private, fast, and secure messaging for the modern world.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-col space-y-4">
                        <h3 className="text-lg font-semibold text-background mb-2">Company</h3>
                        <Link href="/about" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">About Us</Link>
                        <Link href="/blog" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Our Blog</Link>
                        <Link href="/careers" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Careers</Link>
                        <Link href="/contact" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Contact</Link>
                    </div>

                    {/* Legal Links */}
                    <div className="flex flex-col space-y-4">
                        <h3 className="text-lg font-semibold text-background mb-2">Legal</h3>
                        <Link href="/privacy" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Privacy Policy</Link>
                        <Link href="/terms" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Terms of Service</Link>
                        <Link href="/cookies" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Cookie Policy</Link>
                        <Link href="/guidelines" className="text-sm hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block w-fit">Community Guidelines</Link>
                    </div>

                    {/* Social/Contact Section */}
                    <div className="flex flex-col space-y-6">
                        <h3 className="text-lg font-semibold text-background">Connect</h3>
                        <div className="flex items-center gap-4">
                            <a href="#" className="p-2 rounded-full bg-background/5 hover:bg-primary/20 text-background/80 hover:text-primary transition-colors group">
                                <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                            <a href="#" className="p-2 rounded-full bg-background/5 hover:bg-primary/20 text-background/80 hover:text-primary transition-colors group">
                                <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                            <a href="#" className="p-2 rounded-full bg-background/5 hover:bg-primary/20 text-background/80 hover:text-primary transition-colors group">
                                <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                            <a href="#" className="p-2 rounded-full bg-background/5 hover:bg-primary/20 text-background/80 hover:text-primary transition-colors group">
                                <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-background/60 hover:text-background transition-colors group cursor-pointer w-fit">
                            <Mail className="w-4 h-4 group-hover:text-primary transition-colors" />
                            <span>luqya1717@gmail.com</span>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-background/50">
                        &copy; {new Date().getFullYear()} Luqya Inc. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-background/50">
                        <span>Designed with <span className="text-red-500 animate-pulse inline-block">&hearts;</span></span>
                    </div>
                </div>

            </div>
        </footer>
    );
}