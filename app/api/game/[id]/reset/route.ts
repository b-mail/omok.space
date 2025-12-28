import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const roomId = params.id;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { game: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Role check: Only players or host can reset? Let's say anyone for now like before
    const board = Array(15)
      .fill(null)
      .map(() => Array(15).fill(null));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedGame = await (prisma as any).game.upsert({
      where: { roomId },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        board: board as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        moves: [] as any,
        currentPlayer: "black",
        winner: null,
        lastMove: null,
      },
      create: {
        roomId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        board: board as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        moves: [] as any,
        currentPlayer: "black",
      },
    });

    await pusherServer.trigger(`room-${roomId}`, "game-reset", {
      board,
      currentPlayer: "black",
    });

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error("Reset API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
