import Link from "next/link";

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center relative overflow-hidden bg-background p-8'>
      {/* Background Ambience */}
      <div className='absolute top-0 left-0 w-full h-full z-0 pointer-events-none'>
        <div className='absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow' />
        <div
          className='absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow'
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className='z-10 flex flex-col items-center text-center px-4'>
        <h1 className='text-6xl md:text-8xl font-black tracking-tighter mb-6'>
          omok<span className='text-gradient'>.space</span>
        </h1>
        <p className='text-xl md:text-2xl text-gray-400 max-w-2xl mb-12 font-light'>
          깔끔하고 빠른 실시간 온라인 오목 게임을 즐겨보세요.
        </p>

        <div className='flex gap-6'>
          <Link
            href='/lobby'
            className='group relative px-12 py-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full font-bold text-xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95'
          >
            <span className='relative z-10 text-white group-hover:text-gradient transition-colors'>
              입장
            </span>
            <div className='absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 blur-md transition-opacity' />
          </Link>
        </div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />
    </main>
  );
}
