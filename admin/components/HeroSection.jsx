import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function HeroSection() {
    return (
        <section className="relative flex flex-col items-center justify-center w-full min-h-[calc(100vh-100px)] py-12 lg:py-0">

            {/* Very Subtle Background Decor - Right Only */}
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

            <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

                {/* Left Side: Copy & CTA */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 z-10 w-full animate-in slide-in-from-bottom-10 lg:slide-in-from-left-10 fade-in duration-1000 ease-out">

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase border border-primary/20">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        Available on Android
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold tracking-tight text-background leading-[1.1] drop-shadow-sm">
                            Real Connections. <br className="hidden lg:block" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                                Total Privacy.
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-background max-w-[32rem] leading-relaxed">
                            Experience lightning-fast, secure, and meaningful conversations. Your chats belong to you—download Luqya and take control of your digital life today.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
                        <Button
                            size="lg"
                            className="rounded-2xl px-8 md:px-12 py-10 w-full sm:w-auto text-base shadow-[0_8px_30px_rgb(99,102,241,0.25)] hover:shadow-[0_8px_40px_rgb(99,102,241,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-5 bg-foreground text-background group"
                        >
                            <svg
                                className="w-12 h-12 group-hover:scale-110 transition-transform duration-300"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M3.565 2v20c0 .941 1.05 1.492 1.815.963l9.023-6.223L11.5 13.5l-7.935-11.5z" opacity=".2" />
                                <path d="M3.178 2.508C2.923 2.825 2.768 3.327 2.768 4.02v16.096c0 .692.155 1.194.41 1.511L3.23 21.68l8.47-8.106v-3.013L3.23 2.454l-.052.054z" fill="#00e676" />
                                <path d="M15.424 9.42l-3.724 3.14 3.724 3.141 5.955-3.4c.57-.323.821-.774.821-1.28v-.006c0-.505-.25-.956-.821-1.28l-5.955-3.395z" fill="#ffea00" />
                                <path d="M15.424 15.701L11.7 12.56 3.178 21.64c.32.343.834.42 1.408.093l10.838-6.032z" fill="#ff1744" />
                                <path d="M3.178 2.508L11.7 11.587l3.724-3.14L4.586 2.415c-.574-.327-1.088-.25-1.408.093z" fill="#29b6f6" />
                            </svg>
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span className="text-[14px] opacity-90 uppercase font-medium tracking-widest">Get it on</span>
                                <span className="font-bold text-lg sm:text-2xl tracking-wide">Google Play</span>
                            </div>
                        </Button>
                    </div>
                </div>

                {/* Right Side: Image/App Showcase */}
                <div className="w-full shrink-0 lg:flex-1 relative flex justify-center items-center min-h-[400px] sm:h-[600px] lg:h-[800px] animate-in fade-in zoom-in-95 duration-1000 delay-200">
                    <div className="relative w-[120%] lg:w-[130%] h-[120%] lg:h-[130%] min-h-[400px] max-w-[600px] lg:max-w-[900px]">
                        <Image
                            src="/luqya-logo-1.png"
                            alt="Luqya App Interface"
                            fill
                            className="object-contain  drop-shadow-2xl hover:scale-[1.03] transition-transform duration-700 ease-out"
                            priority
                            sizes="(max-width: 868px) 100vw, 50vw"
                            loading='eager'
                        />
                    </div>
                </div>

            </div>
        </section>
    );
}