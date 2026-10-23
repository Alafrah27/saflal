"use client";

import { Mail, Phone, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function Contact() {
    return (
        <div className="w-full min-h-[calc(100vh-80px)] relative flex items-center justify-center overflow-hidden selection:bg-primary/30 py-16 bg-foreground">

            {/* Spectacular Background */}
            {/* <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[150px] pointer-events-none" /> */}

            <div className="container relative z-10 mx-auto px-4 sm:px-6 w-full md:max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-12 items-center">

                    {/* Left Typography & Info */}
                    <div className="flex flex-col justify-center space-y-12 animate-in slide-in-from-left-10 fade-in duration-1000 ease-out">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/5 border border-background/20 text-background text-sm font-medium w-fit shadow-sm backdrop-blur-md">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Let's build something great together
                            </div>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-background leading-[1.05]">
                                Let's start a <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 pb-2">
                                    conversation.
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-background/60 max-w-lg leading-relaxed pt-2">
                                Whether you have a question, an idea, or just want to chat, we are here and ready to listen. Drop us a line below.
                            </p>
                        </div>

                        <div className="flex flex-col space-y-4">
                            {/* Contact Item */}
                            <a href="tel:0555475591" className="group flex items-center gap-6 p-4 -ml-4 rounded-3xl hover:bg-background/10 transition-all duration-300 w-fit">
                                <div className="relative flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-background/5 border border-background/20 shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all duration-300 group-hover:scale-110 backdrop-blur-sm">
                                    <Phone className="w-6 h-6 text-background group-hover:text-primary transition-colors duration-300" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-background/50 uppercase tracking-wider mb-1">Call Us Directly</span>
                                    <span className="text-2xl font-bold text-background">055 547 5591</span>
                                </div>
                            </a>

                            {/* Contact Item */}
                            <a href="mailto:luqya1717@gmail.com" className="group flex items-center gap-6 p-4 -ml-4 rounded-3xl hover:bg-background/10 transition-all duration-300 w-fit">
                                <div className="relative flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-background/5 border border-background/20 shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all duration-300 group-hover:scale-110 backdrop-blur-sm">
                                    <Mail className="w-6 h-6 text-background group-hover:text-primary transition-colors duration-300" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-background/50 uppercase tracking-wider mb-1">Send an Email</span>
                                    <span className="text-2xl font-bold text-background">luqya1717@gmail.com</span>
                                </div>
                            </a>

                            {/* Contact Item */}
                            <div className="group flex items-center gap-6 p-4 -ml-4 rounded-3xl hover:bg-background/10 transition-all duration-300 w-fit cursor-default">
                                <div className="relative flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-background/5 border border-background/20 shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all duration-300 group-hover:scale-110 backdrop-blur-sm">
                                    <MapPin className="w-6 h-6 text-background group-hover:text-primary transition-colors duration-300" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-background/50 uppercase tracking-wider mb-1">Visit Our Office</span>
                                    <span className="text-xl font-bold text-background">Riyadh, Saudi Arabia</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Form: Glassmorphic Premium Form */}
                    <div className="relative animate-in slide-in-from-right-10 fade-in duration-1000 ease-out delay-200 w-full">
                        {/* Decorative background for the form */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-indigo-500/20 transform -rotate-3 rounded-3xl sm:rounded-[3rem] blur-2xl opacity-50 pointer-events-none" />

                        <div className="relative bg-background/5 backdrop-blur-3xl border border-background/20 p-6 sm:p-12 rounded-3xl sm:rounded-[3rem] shadow-2xl xl:shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] shadow-primary/10 overflow-hidden w-full">

                            <div className="mb-10">
                                <h3 className="text-3xl font-extrabold text-background mb-3">Send a Message</h3>
                                <p className="text-background/60 text-lg">We typically reply in minutes.</p>
                            </div>

                            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <label htmlFor="firstName" className="text-sm font-semibold text-background ml-1">First Name</label>
                                        <Input
                                            id="firstName"
                                            placeholder="Jane"
                                            className="h-14 bg-background/10 border-transparent text-background placeholder:text-background/40 focus-visible:bg-background/20 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 rounded-2xl px-6 text-base transition-all duration-300"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <label htmlFor="lastName" className="text-sm font-semibold text-background ml-1">Last Name</label>
                                        <Input
                                            id="lastName"
                                            placeholder="Doe"
                                            className="h-14 bg-background/10 border-transparent text-background placeholder:text-background/40 focus-visible:bg-background/20 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 rounded-2xl px-6 text-base transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="email" className="text-sm font-semibold text-background ml-1">Email Address</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="jane@example.com"
                                        className="h-14 bg-background/10 border-transparent text-background placeholder:text-background/40 focus-visible:bg-background/20 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 rounded-2xl px-6 text-base transition-all duration-300"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="message" className="text-sm font-semibold text-background ml-1">Your Message</label>
                                    <Textarea
                                        id="message"
                                        placeholder="How can we help you?"
                                        className="min-h-[160px] resize-y bg-background/10 border-transparent text-background placeholder:text-background/40 focus-visible:bg-background/20 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 rounded-2xl px-6 py-5 text-base transition-all duration-300 leading-relaxed"
                                    />
                                </div>

                                <Button
                                 variant="default"
                                 size="lg" className="w-full h-16 text-lg font-bold rounded-2xl  text-background hover:bg-primary hover:text-primary-foreground transform active:scale-[0.98] transition-all duration-300 shadow-xl hover:shadow-primary/50 group overflow-hidden relative mt-4">
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Send Message
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                                    </span>
                                </Button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default Contact;