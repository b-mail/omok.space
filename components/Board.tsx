"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import { CellValue, Player } from "@/lib/game/omok";

interface BoardProps {
  board: CellValue[][];
  currentPlayer: Player;
  myPlayer: Player;
  onPlaceStone: (x: number, y: number) => void;
  onFocus: (x: number, y: number) => void;
  focusedPos: { x: number; y: number } | null;
  lastMove: { x: number; y: number } | null;
  winner: Player | null;
}

function Board({
  board,
  currentPlayer,
  myPlayer,
  onPlaceStone,
  onFocus,
  focusedPos,
  lastMove,
  winner,
}: BoardProps) {
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const size = 15;

  const handleClick = (x: number, y: number) => {
    if (board[y][x]) return; // Occupied

    // If double tapping the focused position, confirm placement
    if (focusedPos?.x === x && focusedPos?.y === y) {
      onPlaceStone(x, y);
    } else {
      // Otherwise set focus
      onFocus(x, y);
    }
  };

  return (
    <div className='relative p-1 sm:p-4 glass rounded-xl shadow-2xl w-full max-w-[600px] aspect-square flex items-center justify-center'>
      <div
        className='grid bg-[#eacca5] rounded shadow-inner relative w-full h-full'
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
        }}
        onMouseLeave={() => setHoverPos(null)}
      >
        {/* Grid Lines */}
        {Array.from({ length: size * size }).map((_, i) => {
          const x = i % size;
          const y = Math.floor(i / size);
          const isStarPoint =
            (x === 3 || x === 7 || x === 11) &&
            (y === 3 || y === 7 || y === 11);

          return (
            <div
              key={i}
              className='relative border-[0.5px] border-black/20 flex items-center justify-center cursor-pointer'
              onClick={() => handleClick(x, y)}
              onMouseEnter={() => setHoverPos({ x, y })}
            >
              {/* Star Point */}
              {isStarPoint && (
                <div className='absolute w-1.5 h-1.5 bg-black rounded-full' />
              )}

              {/* Stone */}
              <AnimatePresence>
                {board[y][x] && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-[90%] h-[90%] rounded-full shadow-lg ${
                      board[y][x] === "black"
                        ? "bg-linear-to-br from-gray-800 to-black ring-1 ring-white/10"
                        : "bg-linear-to-br from-white to-gray-200 ring-1 ring-black/5"
                    } transition-all duration-300 transform hover:scale-105`}
                  />
                )}
              </AnimatePresence>

              {/* Focused Stone (Mobile Selection) */}
              {!board[y][x] &&
                focusedPos?.x === x &&
                focusedPos?.y === y &&
                myPlayer === currentPlayer && (
                  <div
                    className={`absolute w-[90%] h-[90%] rounded-full opacity-60 z-10 ${
                      currentPlayer === "black" ? "bg-black" : "bg-white"
                    }`}
                  />
                )}

              {/* Hover Ghost Stone */}
              {!board[y][x] &&
                hoverPos?.x === x &&
                hoverPos?.y === y &&
                myPlayer === currentPlayer &&
                (focusedPos?.x !== x || focusedPos?.y !== y) && // Hide if focused
                !winner && (
                  <div
                    className={`absolute w-[90%] h-[90%] rounded-full opacity-50 z-0 ${
                      currentPlayer === "black" ? "bg-black" : "bg-white"
                    }`}
                  />
                )}

              {/* Last Move Marker */}
              {lastMove?.x === x && lastMove?.y === y && (
                <div className='absolute w-2 h-2 rounded-full bg-primary z-20 shadow-[0_0_10px_rgba(var(--primary),0.8)]' />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(Board);
