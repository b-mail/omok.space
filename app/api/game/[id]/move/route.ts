import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { checkWin, isBanMove } from "@/lib/game/omok";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const roomId = params.id;
    const { x, y } = await req.json();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userName = session.user.name;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const room = await (prisma as any).room.findUnique({
      where: { id: roomId },
      include: { game: true },
    });

    if (!room || !room.game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const game = room.game;
    if (game.winner)
      return NextResponse.json(
        { error: "이미 끝난 게임입니다." },
        { status: 400 }
      );

    // Role check
    const isBlack = room.blackPlayer === userName;
    const isWhite = room.whitePlayer === userName;
    const myRole = isBlack ? "black" : isWhite ? "white" : "spectator";

    if (myRole === "spectator" || myRole !== game.currentPlayer) {
      return NextResponse.json(
        { error: "당신의 차례가 아닙니다." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const board = game.board as any[][];
    if (board[y][x] !== null) {
      return NextResponse.json(
        { error: "이미 돌이 놓인 자리입니다." },
        { status: 400 }
      );
    }

    // 3-3 check for black
    if (myRole === "black" && isBanMove(board, x, y)) {
      return NextResponse.json(
        { error: "3-3 금수 위치입니다." },
        { status: 400 }
      );
    }

    // Place stone
    const newBoard = board.map((row) => [...row]);
    newBoard[y][x] = myRole;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMoves = [...(game.moves as any[]), { x, y, player: myRole }];
    const nextPlayer = myRole === "black" ? "white" : "black";

    let winner = null;
    if (checkWin(newBoard, x, y, myRole)) {
      winner = myRole;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedGame = await (prisma as any).game.update({
      where: { id: game.id },
      data: {
        board: newBoard,
        moves: newMoves,
        currentPlayer: nextPlayer,
        winner,
        lastMove: { x, y },
      },
    });

    // Broadcast update via Pusher
    await pusherServer.trigger(`room-${roomId}`, "stone-placed", {
      x,
      y,
      player: myRole,
      nextPlayer,
      winner,
      board: newBoard, // Optimize later if needed
    });

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error("Move API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
