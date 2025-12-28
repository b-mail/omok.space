"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Board from "@/components/Board";
import { CellValue, Player } from "@/lib/game/omok";
import { io, Socket } from "socket.io-client";
import {
  Lock,
  Eye,
  EyeOff,
  Gamepad2,
  Users,
  X,
  Shield,
  Globe,
  Settings,
  Plus,
  Trash2,
  Ban,
  Save,
  ChevronDown,
} from "lucide-react";
import { useSession } from "next-auth/react";

function GameContent() {
  const { data: session, status } = useSession();
  const { id: roomId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Room Metadata from URL (for creation)
  const metaName = searchParams.get("name");
  const metaPassword = searchParams.get("password");
  const metaAllowSpectators = searchParams.get("allowSpectators") !== "false";

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [roomName, setRoomName] = useState(metaName || "");
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [authError, setAuthError] = useState("");
  const [hostId, setHostId] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isMobileParticipantsOpen, setIsMobileParticipantsOpen] =
    useState(false);

  // Settings Form
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    password: "",
    allowSpectators: true,
  });

  const [board, setBoard] = useState<CellValue[][]>(
    Array(15)
      .fill(null)
      .map(() => Array(15).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>("black");
  const [myRole, setMyRole] = useState<Player | "spectator" | null>(null);
  const [focusedPos, setFocusedPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastMove, setLastMove] = useState<{ x: number; y: number } | null>(
    null
  );
  const [winner, setWinner] = useState<Player | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [blackPlayerName, setBlackPlayerName] = useState<string>("");
  const [whitePlayerName, setWhitePlayerName] = useState<string>("");
  const [participants, setParticipants] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || !roomId) return;

    const name = session.user.name || "사용자";
    const id = (session.user as any).id;

    // Connect to custom server
    const s = io();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);

    s.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      setSocketError(null);
    });

    s.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
      setSocketError("서버 연결에 실패했습니다.");
    });

    s.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    const joinRoom = (passwordOverride?: string) => {
      s.emit("join-room", {
        roomId,
        userName: name,
        dbUserId: id,
        metadata: {
          name: metaName,
          password: passwordOverride || metaPassword,
          allowSpectators: metaAllowSpectators,
        },
      });
    };

    s.on("connect", () => {
      console.log("Connected to server");
      joinRoom();
    });

    s.on("role-assigned", (role) => {
      setMyRole(role);
      console.log("Assigned role:", role);
    });

    s.on(
      "game-state",
      ({
        board,
        currentPlayer,
        lastMove,
        winner: currentWinner,
        roomName: serverRoomName,
        allowSpectators: serverAllowSpectators,
        hostId: serverHostId,
      }) => {
        setBoard(board);
        setCurrentPlayer(currentPlayer);
        setLastMove(lastMove);
        setWinner(currentWinner || null);
        if (serverRoomName) setRoomName(serverRoomName);
        if (serverAllowSpectators !== undefined)
          setAllowSpectators(serverAllowSpectators);
        if (serverHostId) setHostId(serverHostId);

        // Init settings form
        setSettingsForm((prev) => ({
          ...prev,
          name: serverRoomName || prev.name,
          allowSpectators: serverAllowSpectators ?? prev.allowSpectators,
        }));

        setIsAuthModalOpen(false);
      }
    );

    s.on("kicked", (msg) => {
      alert(msg);
      router.push("/lobby");
    });

    s.on("room-closed", (msg) => {
      alert(msg);
      router.push("/lobby");
    });

    s.on("game-reset", () => {
      setWinner(null);
      setLastMove(null);
    });

    s.on("stone-placed", ({ x, y, player, nextPlayer }) => {
      setBoard((prev) => {
        const newBoard = [...prev];
        newBoard[y] = [...newBoard[y]];
        newBoard[y][x] = player;
        return newBoard;
      });
      setLastMove({ x, y });
      setCurrentPlayer(nextPlayer);
    });

    s.on("game-ended", ({ winner }) => {
      setWinner(winner);
    });

    s.on(
      "room-status",
      ({ playerCount, blackPlayer, whitePlayer, participants }) => {
        setPlayerCount(playerCount);
        setBlackPlayerName(blackPlayer || "");
        setWhitePlayerName(whitePlayer || "");
        setParticipants(participants || []);
      }
    );

    s.on("error", ({ message, type }) => {
      if (type === "AUTH_REQUIRED") {
        setIsAuthModalOpen(true);
        if (message && message !== "비밀번호가 필요합니다.") {
          setAuthError(message);
        } else {
          setAuthError("");
        }

        if (message === "비밀번호가 일치하지 않습니다.") {
          setAuthError(message);
        } else {
          setAuthError("");
        }
      } else {
        alert(message);
      }
    });

    // Handle password submission
    const handleAuthSubmit = (password: string) => {
      setAuthError(""); // Clear error on submit attempt
      s.emit("join-room", {
        roomId,
        userName: name,
        dbUserId: id,
        metadata: { password },
      });
    };
    (s as any).submitAuth = handleAuthSubmit;

    return () => {
      s.disconnect();
    };
  }, [roomId, status, session, metaName, metaPassword, metaAllowSpectators]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleChangeRole = (newRole: string) => {
    if (myRole === newRole) return;
    socket?.emit("change-role", { roomId, newRole });
  };

  const handleKickUser = (targetId: string) => {
    if (!confirm("정말 이 사용자를 강퇴하시겠습니까?")) return;
    socket?.emit("kick-user", { roomId, targetId });
  };

  const handleDeleteRoom = () => {
    if (!confirm("정말 방을 삭제하시겠습니까? 모든 유저가 퇴장됩니다.")) return;
    socket?.emit("delete-room", roomId);
  };

  const handleUpdateSettings = () => {
    socket?.emit("update-room-settings", {
      roomId,
      name: settingsForm.name,
      password: settingsForm.password || undefined,
      allowSpectators: settingsForm.allowSpectators,
    });
    setIsSettingsModalOpen(false);
  };

  // useCallback to prevent Board re-renders
  const handlePlaceStone = useCallback(
    (x: number, y: number) => {
      if (myRole === "spectator" || myRole !== currentPlayer || winner) return;
      socket?.emit("place-stone", { roomId, x, y });
      setFocusedPos(null);
    },
    [myRole, currentPlayer, winner, socket, roomId]
  );

  const handleFocus = useCallback(
    (x: number, y: number) => {
      if (myRole === "spectator" || myRole !== currentPlayer || winner) return;
      // If clicking the same spot, place it (double tap)
      if (focusedPos?.x === x && focusedPos?.y === y) {
        handlePlaceStone(x, y);
      } else {
        setFocusedPos({ x, y });
      }
    },
    [myRole, currentPlayer, winner, focusedPos, handlePlaceStone]
  );

  // Note: Intentionally NOT changing scroll logic here
  // ...

  const isHost = session?.user && (session.user as any).id === hostId;

  return (
    <main className='min-h-screen flex flex-col items-center bg-background relative overflow-x-hidden p-8'>
      {/* ... (Header code skipped, keeping context for lower part) ... */}

      {/* Header / Nav */}
      <header className='w-full max-w-7xl mx-auto mb-6 flex items-center justify-between z-20'>
        <button
          onClick={() => setIsExitModalOpen(true)}
          className='text-gray-400 hover:text-white flex items-center gap-2 transition-colors'
        >
          <X className='w-5 h-5' />
          <span className='hidden sm:inline'>나가기</span>
        </button>

        <div className='flex items-center gap-3 glass px-6 py-2 rounded-full border border-white/10 shadow-xl max-w-[60vw] sm:max-w-md overflow-hidden'>
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                : "bg-red-500 animate-pulse"
            }`}
            title={isConnected ? "연결됨" : "연결 안됨"}
          />
          <div className='relative w-full overflow-hidden'>
            {/* We use a simple CSS-based marquee or Framer Motion loop */}
            <div className='flex items-center justify-center w-full'>
              {(roomName || metaName || "게임 중").length > 12 ? (
                <div className='w-40 sm:w-60 h-8 relative overflow-hidden group'>
                  <div className='absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#13111C]/80 to-transparent z-10'></div>
                  <div className='absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#13111C]/80 to-transparent z-10'></div>
                  <motion.div
                    className='whitespace-nowrap font-black text-lg sm:text-xl text-white absolute left-0'
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: Math.max(
                        5,
                        (roomName || metaName || "").length * 0.5
                      ),
                      ease: "linear",
                      repeatType: "loop",
                    }}
                  >
                    <span className='mr-8'>
                      {roomName || metaName || "게임 중"}
                    </span>
                    <span className='mr-8'>
                      {roomName || metaName || "게임 중"}
                    </span>
                    <span className='mr-8'>
                      {roomName || metaName || "게임 중"}
                    </span>
                  </motion.div>
                </div>
              ) : (
                <span className='text-white font-black text-lg sm:text-xl whitespace-nowrap'>
                  {roomName || metaName || "게임 중"}
                </span>
              )}
            </div>
          </div>

          <span className='block text-xs font-medium text-gray-500 whitespace-nowrap'>
            # {String(roomId).slice(0, 4)}
          </span>
          {isHost && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className='shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white'
            >
              <Settings className='w-4 h-4' />
            </button>
          )}
        </div>

        {/* Placeholder for symmetry or explicit spacing */}
        <div className='w-[70px] hidden sm:block'></div>
      </header>

      {/* Main Layout */}
      <div
        className={`z-10 w-full flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-12 max-w-7xl mx-auto transition-all duration-500 ${
          winner ? "blur-md pointer-events-none scale-[0.98]" : ""
        }`}
      >
        {/* Left: Game Area */}
        <div className='w-full flex flex-col items-center'>
          {/* Game Status */}
          <div className='mb-8 text-center w-full px-4'>
            <div className='flex justify-center items-center gap-3 sm:gap-12 mb-6'>
              <div
                className={`flex flex-col items-center gap-2 p-2 sm:p-4 rounded-2xl border transition-colors ${
                  currentPlayer === "black"
                    ? "bg-white/10 border-white/20"
                    : "bg-transparent border-transparent opacity-50"
                }`}
              >
                <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black border border-white/20 shadow-lg' />
                <div className='text-xs sm:text-sm font-bold text-white max-w-[80px] sm:max-w-[120px] truncate text-center'>
                  흑: {blackPlayerName || "대기 중"}
                </div>
              </div>
              <div className='text-xl sm:text-3xl font-black text-gray-700'>
                VS
              </div>
              <div
                className={`flex flex-col items-center gap-2 p-2 sm:p-4 rounded-2xl border transition-colors ${
                  currentPlayer === "white"
                    ? "bg-white/10 border-white/20"
                    : "bg-transparent border-transparent opacity-50"
                }`}
              >
                <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-black/10 shadow-lg' />
                <div className='text-xs sm:text-sm font-bold text-white max-w-[80px] sm:max-w-[120px] truncate text-center'>
                  백: {whitePlayerName || "대기 중"}
                </div>
              </div>
            </div>
          </div>

          {/* Board */}
          <Board
            board={board}
            currentPlayer={currentPlayer}
            myPlayer={myRole as Player}
            onPlaceStone={handlePlaceStone}
            onFocus={handleFocus}
            focusedPos={focusedPos}
            lastMove={lastMove}
            winner={winner}
          />

          {/* Mobile Confirm Button */}
          <AnimatePresence>
            {focusedPos && myRole === currentPlayer && !winner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className='fixed bottom-8 left-1/2 -translate-x-1/2 z-30'
              >
                <button
                  onClick={() => handlePlaceStone(focusedPos.x, focusedPos.y)}
                  className='px-8 py-3 bg-primary text-white font-black text-lg rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2'
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      currentPlayer === "black"
                        ? "bg-black border border-white/30"
                        : "bg-white border border-black/10"
                    }`}
                  />
                  착수하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Participant List */}
        <aside className='w-full lg:w-72 glass-card rounded-3xl p-6 h-fit lg:sticky lg:top-8 border border-white/5'>
          <div
            className='flex items-center justify-between cursor-pointer lg:cursor-default'
            onClick={() =>
              setIsMobileParticipantsOpen(!isMobileParticipantsOpen)
            }
          >
            <h2 className='text-xl font-bold flex items-center gap-2'>
              참가자
              <span className='text-sm font-normal text-gray-500'>
                {participants.length}명
              </span>
            </h2>
            <ChevronDown
              className={`w-5 h-5 lg:hidden text-gray-400 transition-transform ${
                isMobileParticipantsOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          <div
            className={`space-y-6 mt-6 ${
              isMobileParticipantsOpen ? "block" : "hidden"
            } lg:block`}
          >
            {/* Players Section */}
            <div>
              <h3 className='text-xs font-bold text-gray-500 uppercase tracking-widest mb-3'>
                플레이어
              </h3>
              <div className='space-y-2'>
                {[
                  { name: blackPlayerName, role: "black", label: "흑" },
                  { name: whitePlayerName, role: "white", label: "백" },
                ].map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      p.name
                        ? "bg-white/5 border-white/10"
                        : "border-dashed border-white/5 opacity-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        p.role === "black"
                          ? "bg-black text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      {p.label}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-bold truncate'>
                        {p.name || "입장 대기..."}
                      </div>
                    </div>
                    {participants.some(
                      (part) => part.name === p.name && part.role === p.role
                    ) && (
                      <div className='w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' />
                    )}
                    {isHost && p.name && p.name !== session?.user?.name && (
                      <button
                        onClick={() => {
                          const target = participants.find(
                            (part) =>
                              part.name === p.name && part.role === p.role
                          );
                          if (target) handleKickUser(target.id);
                        }}
                        className='p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-2'
                        title='강퇴'
                      >
                        <Ban className='w-3 h-3' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Spectators Section */}
            {allowSpectators && (
              <div>
                <h3 className='text-xs font-bold text-gray-500 uppercase tracking-widest mb-3'>
                  관전자
                </h3>
                <div className='max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2'>
                  {participants.filter((p) => p.role === "spectator").length >
                  0 ? (
                    participants
                      .filter((p) => p.role === "spectator")
                      .map((p) => (
                        <div
                          key={p.id}
                          className='flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group'
                        >
                          <div className='w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-500 group-hover:text-primary transition-colors'>
                            EYE
                          </div>
                          <span
                            className={`text-sm truncate ${
                              p.name === session?.user?.name
                                ? "text-primary font-bold"
                                : "text-gray-300"
                            }`}
                          >
                            {p.name}
                          </span>
                          {isHost && p.name !== session?.user?.name && (
                            <button
                              onClick={() => handleKickUser(p.id)}
                              className='p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded ml-auto transition-colors'
                              title='강퇴'
                            >
                              <X className='w-3 h-3' />
                            </button>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className='text-xs text-center py-4 text-gray-600 italic'>
                      관전자가 없습니다
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Role Settings */}
            <div className='pt-6 border-t border-white/5'>
              <h3 className='text-xs font-bold text-gray-500 uppercase tracking-widest mb-4'>
                역할 변경
              </h3>
              <div className='grid grid-cols-2 gap-2'>
                <button
                  onClick={() => handleChangeRole("black")}
                  disabled={
                    !!blackPlayerName && blackPlayerName !== session?.user?.name
                  }
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    myRole === "black"
                      ? "bg-white text-black border-white"
                      : "bg-white/5 text-white border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  흑 참가
                </button>
                <button
                  onClick={() => handleChangeRole("white")}
                  disabled={
                    !!whitePlayerName && whitePlayerName !== session?.user?.name
                  }
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    myRole === "white"
                      ? "bg-white text-black border-white"
                      : "bg-white/5 text-white border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  백 참가
                </button>
                {allowSpectators && (
                  <button
                    onClick={() => handleChangeRole("spectator")}
                    className={`col-span-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                      myRole === "spectator"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                    }`}
                  >
                    관전 모드
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {winner && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className='relative w-full max-w-lg glass-card rounded-[2.5rem] p-10 border border-white/10 shadow-2xl overflow-hidden'
            >
              <div className='flex items-center gap-4 mb-10'>
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${
                    winner === "black"
                      ? "bg-black border-white/20"
                      : "bg-white border-black/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      winner === "black" ? "bg-white/20" : "bg-black/10"
                    }`}
                  />
                </div>
                <div>
                  <h1 className='text-3xl font-black text-white'>
                    {winner === "black"
                      ? blackPlayerName || "흑"
                      : whitePlayerName || "백"}
                    님의 승리!
                  </h1>
                  <p className='text-gray-400 text-sm'>
                    치열한 승부 끝에 우승을 차지했습니다.
                  </p>
                </div>
              </div>

              <div className='space-y-4'>
                <button
                  onClick={() => socket?.emit("reset-game", roomId)}
                  className='w-full py-5 bg-white text-black font-black rounded-[1.5rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl'
                >
                  다시 시작
                </button>
                <button
                  onClick={() => router.push("/lobby")}
                  className='w-full py-5 bg-white/5 text-white font-black rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-all'
                >
                  로비로 나가기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className='fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className='relative w-full max-w-lg glass-card rounded-[2.5rem] p-10 border border-white/10 shadow-2xl overflow-hidden'
            >
              <div className='flex items-center gap-4 mb-8'>
                <div className='w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg text-primary'>
                  <Lock className='w-7 h-7' />
                </div>
                <div>
                  <h2 className='text-3xl font-black text-white'>
                    비밀번호 입력
                  </h2>
                  <p className='text-gray-400 text-sm'>
                    이 방은 비밀번호가 설정되어 있습니다.
                  </p>
                  {authError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='text-red-500 text-xs font-bold mt-2'
                    >
                      {authError}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className='space-y-6'>
                <div>
                  <label className='block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1'>
                    참가 비밀번호
                  </label>
                  <div className='relative'>
                    <input
                      type='password'
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (socket as any)?.submitAuth(authPassword);
                        }
                      }}
                      autoFocus
                      placeholder='비밀번호를 입력하세요'
                      className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors'
                    />
                    <Lock className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                  </div>
                </div>

                <div className='flex flex-col gap-3'>
                  <button
                    onClick={() => (socket as any)?.submitAuth(authPassword)}
                    className='w-full py-5 bg-white text-black font-black rounded-[1.5rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl'
                  >
                    입장하기
                  </button>
                  <button
                    onClick={() => router.push("/lobby")}
                    className='w-full py-5 bg-white/5 text-gray-400 font-bold rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-all'
                  >
                    로비로 돌아가기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExitModalOpen && (
          <div className='fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className='relative w-full max-w-sm glass-card bg-[#13111C]/90 rounded-[2rem] p-8 border border-white/10 shadow-2xl overflow-hidden text-center'
            >
              <div className='w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6'>
                <X className='w-8 h-8 text-red-500' />
              </div>

              <h2 className='text-2xl font-bold mb-2'>나가시겠습니까?</h2>
              <p className='text-gray-400 text-sm mb-8 leading-relaxed'>
                게임에서 퇴장합니다.
                <br />
                <span className='text-red-400 font-medium'>
                  남은 플레이어가 없으면 방이 사라집니다.
                </span>
              </p>

              <div className='flex gap-3'>
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className='flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all'
                >
                  취소
                </button>
                <button
                  onClick={() => router.push("/lobby")}
                  className='flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20'
                >
                  나가기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className='absolute inset-0 bg-black/80 backdrop-blur-md'
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className='relative w-full max-w-lg glass-card bg-[#13111C]/90 rounded-[2.5rem] p-10 border border-white/10 shadow-2xl overflow-hidden'
            >
              <div className='flex items-center justify-between mb-8'>
                <h2 className='text-2xl font-bold flex items-center gap-3'>
                  <Settings className='w-6 h-6 text-primary' />방 설정
                </h2>
                <button
                  onClick={() => handleDeleteRoom()}
                  className='px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-2'
                >
                  <Trash2 className='w-3 h-3' />방 삭제
                </button>
              </div>

              <div className='space-y-6'>
                <div>
                  <label className='block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1'>
                    방 제목
                  </label>
                  <input
                    value={settingsForm.name}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1'>
                    비밀번호{" "}
                    <span className='text-gray-600 normal-case'>
                      (변경시에만 입력)
                    </span>
                  </label>
                  <div className='relative'>
                    <input
                      type='password'
                      value={settingsForm.password}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder='비밀번호를 설정하려면 입력하세요'
                      className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50'
                    />
                    <Lock className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                  </div>
                </div>

                <div
                  className='flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer'
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      allowSpectators: !prev.allowSpectators,
                    }))
                  }
                >
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      settingsForm.allowSpectators
                        ? "bg-primary"
                        : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                        settingsForm.allowSpectators
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </div>
                  <div className='flex-1'>
                    <div className='font-bold text-sm'>관전 허용</div>
                    <div className='text-xs text-gray-400'>
                      다른 사용자가 게임을 관전할 수 있습니다.
                    </div>
                  </div>
                </div>

                <div className='flex gap-3 pt-4'>
                  <button
                    onClick={() => setIsSettingsModalOpen(false)}
                    className='flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold transition-colors'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdateSettings}
                    className='flex-[2] py-4 rounded-xl bg-white text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2'
                  >
                    <Save className='w-4 h-4' />
                    설정 저장
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-background flex items-center justify-center'>
          <div className='w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin' />
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
