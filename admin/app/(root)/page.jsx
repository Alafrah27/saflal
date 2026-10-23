import HeroSection from "@/components/HeroSection";
import Introductions from "@/components/Introductions";

function Home() {
  return (
    <div className=" container mx-auto flex flex-col w-full min-h-full">
      <HeroSection />
      <Introductions />
    </div>
  )
}

export default Home;
