import React from 'react';
import { Heart, Shield, Zap, Globe2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const features = [
    {
        id: 1,
        title: "Intimate Connections",
        description: "In a world full of noise, we bring you closer to the voices that truly matter. Meaningful conversations happen here.",
        icon: Heart,
        color: "text-rose-500",
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/20"
    },
    {
        id: 2,
        title: "Absolute Privacy",
        description: "Your digital life belongs to you. We ensure that every message, picture, and emotion shared remains strictly yours.",
        icon: Shield,
        color: "text-indigo-500",
        bgColor: "bg-indigo-500/10",
        borderColor: "border-indigo-500/20"
    },
    {
        id: 3,
        title: "Instantaneous",
        description: "Feel the presence of your loved ones instantly. Blazing fast delivery makes distance feel like an illusion.",
        icon: Zap,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20"
    },
    {
        id: 4,
        title: "Boundless Calling",
        description: "Hear their voice or see their smile from anywhere on Earth, with crystal-clear audio and high-definition video.",
        icon: Globe2,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20"
    }
];

export default function Introductions() {
    return (
        <section className="w-full py-24  relative overflow-hidden">

            {/* Ambient Background Accents */}
            <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-[100%] blur-[120px] -z-10 pointer-events-none" />

            <div className="container mx-auto px-6 max-w-6xl">

                {/* Section Header */}
                <div className="flex flex-col items-center text-center space-y-4 mb-20 animate-in slide-in-from-bottom-5 fade-in duration-1000">
                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-background">
                        Why Choose <span className="text-primary">Luqya?</span>
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                        We built this platform for the moments that take your breath away. Not just an app, but a private sanctuary for your relationships.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <Card
                            key={feature.id}
                            className="group relative flex flex-col items-start bg-foreground dark:bg-foreground/50 border border-border/40 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden"
                            style={{ animationDelay: `${index * 150}ms`, borderRadius: '1.5rem' }}
                        >
                            {/* Hover Gradient Overlay */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-primary/5 via-transparent to-transparent transition-opacity duration-500 pointer-events-none" />

                            <CardHeader className="w-full pb-2 pt-8 px-8">
                                {/* Icon Container */}
                                <div className={`w-fit p-4 rounded-2xl ${feature.bgColor} ${feature.borderColor} border mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                                </div>

                                {/* Text Content */}
                                <CardTitle className="text-xl font-bold text-background tracking-tight z-10">
                                    {feature.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="px-8 pb-8 pt-2">
                                <p className="text-background/60 leading-relaxed text-sm z-10">
                                    {feature.description}
                                </p>
                            </CardContent>

                        </Card>
                    ))}
                </div>

            </div>
        </section>
    );
}