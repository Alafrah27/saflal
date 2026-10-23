import Navber from "@/components/Navber";
import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
    return (
        <>
            <div className="container mx-auto p-0 md:p-4 ">
                <Navber />
                <div className="container mx-auto p-4 flex-1">
                    {children}
                </div>
                <Footer />
            </div>
        </>
    )
}