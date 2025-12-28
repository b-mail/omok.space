import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, password, allowSpectators } = await req.json();

    const room = await prisma.room.create({
      data: {
        name: name || `${session.user.name}의 방`,
        password: password || null,
        allowSpectators: allowSpectators ?? true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hostId: (session.user as any).id,
      },
    });

    // Broadcast room list update via Pusher
    await pusherServer.trigger("lobby", "room-list-update", {});

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
