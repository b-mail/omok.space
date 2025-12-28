import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { game: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to fetch room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: roomId } = await params;
    const { action, ...data } = await req.json();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id;
    void userId;
    const userName = session.user.name;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { game: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (action === "join") {
      // Logic for joining (handled mostly client side with Pusher Presence,
      // but we might need to update room state in DB)
      return NextResponse.json({ success: true });
    }

    if (action === "change-role") {
      const { newRole } = data;
      // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
      let updateData: any = {};

      if (newRole === "black") {
        if (room.blackPlayer)
          return NextResponse.json(
            { error: "이미 흑돌 플레이어가 있습니다." },
            { status: 400 }
          );
        updateData.blackPlayer = userName;
        if (room.whitePlayer === userName) updateData.whitePlayer = null;
      } else if (newRole === "white") {
        if (room.whitePlayer)
          return NextResponse.json(
            { error: "이미 백돌 플레이어가 있습니다." },
            { status: 400 }
          );
        updateData.whitePlayer = userName;
        if (room.blackPlayer === userName) updateData.blackPlayer = null;
      } else {
        if (room.blackPlayer === userName) updateData.blackPlayer = null;
        if (room.whitePlayer === userName) updateData.whitePlayer = null;
      }

      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: updateData,
      });

      await pusherServer.trigger(`room-${roomId}`, "room-status-update", {
        blackPlayer: updatedRoom.blackPlayer,
        whitePlayer: updatedRoom.whitePlayer,
      });

      return NextResponse.json(updatedRoom);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Room API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
