"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Gamepad2, Users, Plus, Search, Eye } from "lucide-react";
import Pusher from "pusher-js";

interface Room {
  id: string;
  name: string;
  password?: string | null;
  allowSpectators: boolean;
  hostId: string;
  blackPlayer?: string | null;
  whitePlayer?: string | null;
  playerCount: number;
}

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    allowSpectators: true,
  });

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data: Room[] = await res.json();
        setActiveRooms(data);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user) {
      // eslint-disable-next-line
      void fetchRooms();

      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });

      const channel = pusher.subscribe("lobby");

      pusher.connection.bind("connected", () => setIsConnected(true));
      pusher.connection.bind("disconnected", () => setIsConnected(false));
      pusher.connection.bind("error", () => setIsConnected(false));

      channel.bind("room-list-update", () => {
        console.log("Room list update received");
        void fetchRooms();
      });

      return () => {
        pusher.unsubscribe("lobby");
        void pusher.disconnect();
      };
    }
  }, [status, router, session, fetchRooms]);

  const createRoom = async () => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const room = await res.json();
        router.push(`/game/${room.id}`);
      } else {
        const error = await res.json();
        alert(error.error || "방 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("서버 오류가 발생했습니다.");
    }
  };

  return (
    <main className='min-h-screen relative overflow-hidden bg-background p-8'>
      {/* Background Ambience */}
      <div className='absolute inset-0 bg-linear-to-br from-white/10 to-transparent' />
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-linear-to-br from-white to-gray-400 shadow-[0.5px_1px_2px_rgba(0,0,0,0.5),inset_-0.5px_-0.5px_1px_rgba(0,0,0,0.2)]' />
      <header className='relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-12'>
        <div>
          <h1 className='text-4xl font-black tracking-tighter mb-2'>
            게임 <span className='text-gradient'>대기실</span>
          </h1>
          <p className='text-gray-500 text-sm font-medium'>
            현재 {activeRooms.length}개의 방이 활성화되어 있습니다.
          </p>
        </div>

        <div className='flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-2xl'>
          {/* Search Bar */}
          <div className='relative flex-1 group'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors' />
            <input
              type='text'
              placeholder='방 제목 또는 ID로 검색...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white'
              >
                <Plus className='w-4 h-4 rotate-45' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-4'>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/5 text-xs font-medium ${
                isConnected ? "text-green-400" : "text-red-400 animate-pulse"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected
                    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    : "bg-red-500"
                }`}
              />
              {isConnected ? "Server Online" : "Server Offline"}
            </div>
            <div className='flex items-center gap-3 glass px-4 py-2 rounded-full border border-white/5'>
              <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-white/20'>
                <span className='text-xs font-bold text-primary'>
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <span className='font-medium text-gray-200'>
                {session?.user?.name || "사용자"}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className='px-2 py-2 text-sm text-gray-400 hover:text-white transition-colors'
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <section className='relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8'>
        {/* Create Room Card */}
        <button
          onClick={() => setIsModalOpen(true)}
          className='group relative flex flex-col items-center justify-center p-8 glass-card rounded-3xl hover:bg-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] border-dashed border-2 border-white/10 hover:border-primary/50'
        >
          <div className='w-16 h-16 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center mb-4 group-hover:shadow-[0_0_30px_rgba(123,44,191,0.5)] transition-shadow'>
            <Plus className='w-8 h-8 text-white' />
          </div>
          <h2 className='text-2xl font-bold mb-2'>방 만들기</h2>
          <p className='text-gray-400 text-center'>
            새로운 방을 만들어 대전을 시작합니다.
          </p>
        </button>

        {/* Active Rooms */}
        {activeRooms
          .filter(
            (room) =>
              room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              room.id.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((room) => (
            <motion.div
              layout
              key={room.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className='glass-card p-6 rounded-3xl flex flex-col justify-between hover:border-white/20 transition-colors'
            >
              <div>
                <div className='flex justify-between items-start mb-4'>
                  <span className='px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white/5 rounded-full text-primary flex items-center gap-1.5'>
                    {room.blackPlayer && room.whitePlayer
                      ? "진행 중"
                      : "대기 중"}
                  </span>
                  <span className='text-gray-500 text-sm flex items-center gap-2'>
                    {room.password && <Lock className='w-3 h-3' />}#{" "}
                    {room.id.slice(0, 4)}
                  </span>
                </div>
                <h3 className='text-xl font-bold mb-1 truncate'>{room.name}</h3>
                <p className='text-gray-400 text-sm flex items-center gap-2'>
                  <Users className='w-3 h-3' />
                  {room.playerCount}명 참가 중
                </p>
              </div>

              <button
                onClick={() => router.push(`/game/${room.id}`)}
                className='mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2 group'
              >
                참여하기
                <Gamepad2 className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
              </button>
            </motion.div>
          ))}

        {activeRooms.length > 0 &&
          activeRooms.filter(
            (room) =>
              room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              room.id.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
            <div className='col-span-full py-20 flex flex-col items-center justify-center text-gray-500'>
              <Search className='w-12 h-12 mb-4 opacity-20' />
              <p className='text-xl font-bold'>검색 결과가 없습니다.</p>
              <p className='text-sm'>다른 키워드로 검색해보세요.</p>
            </div>
          )}

        {activeRooms.length === 0 && (
          <div className='col-span-full py-20 flex flex-col items-center justify-center text-gray-600'>
            <p className='text-xl font-bold italic'>
              현재 개설된 방이 없습니다.
            </p>
          </div>
        )}
      </section>

      {/* Create Room Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className='absolute inset-0 bg-black/80 backdrop-blur-md'
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className='relative w-full max-w-lg glass-card bg-[#13111C]/90 rounded-[2.5rem] p-10 border border-white/10 shadow-2xl overflow-hidden'
            >
              <div className='absolute top-0 right-0 p-8'>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='text-gray-500 hover:text-white transition-colors'
                >
                  <Plus className='w-6 h-6 rotate-45' />
                </button>
              </div>

              <div className='flex items-center gap-4 mb-8'>
                <div className='w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30'>
                  <Plus className='w-6 h-6 text-primary' />
                </div>
                <div>
                  <h2 className='text-3xl font-black'>방 만들기</h2>
                  <p className='text-gray-400 text-sm'>
                    새로운 대전 환경을 설정하세요.
                  </p>
                </div>
              </div>

              <div className='space-y-6'>
                <div>
                  <label className='block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1'>
                    방 제목
                  </label>
                  <input
                    type='text'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='친구와 한 판!'
                    className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1'>
                    비밀번호 (선택)
                  </label>
                  <div className='relative'>
                    <input
                      type='password'
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder='비밀번호 설정 시 잠금'
                      className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors'
                    />
                    <Lock className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                  </div>
                </div>

                <div className='flex items-center justify-between px-5 py-4 bg-white/5 rounded-2xl border border-white/5'>
                  <div className='flex items-center gap-3'>
                    <Eye className='w-5 h-5 text-gray-400' />
                    <div>
                      <div className='text-sm font-bold'>관전 허용</div>
                      <div className='text-[10px] text-gray-500 uppercase tracking-wider'>
                        다른 사용자가 경기를 볼 수 있습니다
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        allowSpectators: !formData.allowSpectators,
                      })
                    }
                    className={`w-14 h-8 rounded-full relative transition-colors ${
                      formData.allowSpectators ? "bg-primary" : "bg-gray-800"
                    }`}
                  >
                    <motion.div
                      animate={{ x: formData.allowSpectators ? 28 : 4 }}
                      className='absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg'
                    />
                  </button>
                </div>

                <button
                  onClick={createRoom}
                  className='w-full py-5 bg-white text-black font-black rounded-[1.5rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl mt-4'
                >
                  대전 시작하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
