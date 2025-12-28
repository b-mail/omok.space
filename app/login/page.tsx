"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    const result = await signIn("credentials", {
      username,
      redirect: false,
      callbackUrl: "/lobby",
    });

    if (result?.ok) {
      router.push("/lobby");
    } else {
      console.error("Login failed:", result?.error);
      alert("로그인 실패: " + (result?.error || "알 수 없는 오류"));
      setIsLoading(false);
    }
  };

  return (
    <main className='flex min-h-screen flex-col items-center justify-center relative overflow-hidden bg-background p-8'>
      {/* Ambience */}
      <div className='absolute inset-0 z-0 pointer-events-none'>
        <div className='absolute top-0 right-0 w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full' />
        <div className='absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/10 blur-[100px] rounded-full' />
      </div>

      <div className='z-10 relative glass-card p-12 rounded-3xl max-w-md w-full text-center border border-white/5 space-y-8'>
        <div>
          <h1 className='text-4xl font-bold mb-2'>로그인</h1>
          <p className='text-gray-400'>이름을 입력하고 대전을 시작하세요</p>
        </div>

        <form onSubmit={handleLogin} className='space-y-4'>
          <input
            type='text'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder='닉네임을 입력하세요'
            className='w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary/50 transition-colors'
            required
            autoFocus
          />
          <button
            type='submit'
            disabled={isLoading || !username.trim()}
            className='w-full relative group px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed'
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin' />
                접속 중...
              </span>
            ) : (
              "게임 입장"
            )}
          </button>
        </form>

        <div className='pt-4 border-t border-white/10'>
          <Link
            href='/'
            className='text-sm text-gray-500 hover:text-white transition-colors'
          >
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
