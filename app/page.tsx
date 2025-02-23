'use client'

// import Image from 'next/image';
import { RecommendationForm } from "../components/RecommendationForm"

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-24 bg-white text-blue-950'>
      <div className="fixed bg-primary top-0 left-0 right-0 shadow-custom2 z-50">
        <div className="border-b border-transparent h-[8vh] md:h-[9vh] flex justify-between items-center pr-4 md:px-8 bg-sky-950 text-white">
          <div className="flex items-center cursor-pointer">
            {/* <Image src="/logo" alt="Logo" width={24} height={24} /> */}
            <p className="text-LightGray font-semibold text-xl tracking-wide">
              Immedi<span className="text-secondary text-yellow-500">&apos;Cure</span>
            </p>
          </div>
          <div className="hidden md:flex lg:flex gap-5 lg:gap-8 text-LightGray text-sm md:text-[16px] font-medium tracking-wide">
            <div className="cursor-pointer hover:text-yellow-500">Home</div>
            <div className="cursor-pointer hover:text-yellow-500">About</div>
            <div className="relative cursor-pointer hover:text-yellow-500">Treatments</div>
            <div className="cursor-pointer hover:text-yellow-500">Blog</div>
            <div className="cursor-pointer hover:text-yellow-500">Contact Us</div>
          </div>
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-8 md:text-6xl md:w-full text-center text-blue-950">
        Immedi<span className="text-secondary text-yellow-500">&apos;Cure</span>
      </h1>
      <p className="text-bold mb-4 md:text-xl text-center">
        Get instant doctor recommendations based on your symptoms and location.
        <br />
        We&apos;ll help you find the best doctors near you.
      </p>
      <RecommendationForm />
    </main>
  )
}

