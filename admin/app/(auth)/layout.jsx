import { Metadata } from "next";
export const metadata = {
    title: {
        template: "%s | Luqya",
        default: "Authentication | Luqya Chat App",
    },
    description:
        "Access your Luqya account or create a new one to enjoy secure and modern messaging.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function AuthLayout({
    children,

}) {
    return <div>{children}</div>;
}