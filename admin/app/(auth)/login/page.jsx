
import React from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
function Login() {
    return (
        <section className="flex flex-col items-center justify-center min-h-screen">
            <div className="w-full max-w-md">
                <Card className="p-8 bg-foreground text-background border border-background/20 shadow-xl">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <h1 className="text-4xl font-bold">Login</h1>
                        <p className="text-lg text-center text-background/80">
                            Sign in to access your Luqya account.
                        </p>
                        <form className="w-full flex flex-col gap-5 mt-4">
                            <Input
                                type="email"
                                placeholder="Email address"
                                className="bg-transparent text-background py-4 h-auto text-md border border-background/50 focus-visible:ring-background/50 placeholder:text-background/50"
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                className="bg-transparent text-background py-4 h-auto text-md border border-background/50 focus-visible:ring-background/50 placeholder:text-background/50"
                            />
                            <Button
                                variant="default"
                                type="submit"
                                className="w-full  text-background hover:bg-background/10 py-4 h-auto text-lg mt-2"
                            >
                                Login
                            </Button>
                        </form>
                        <p className="mt-4 text-center text-sm text-background/80">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-background font-semibold hover:underline">
                                Register
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>
        </section>
    )
}

export default Login
