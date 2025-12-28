import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.formData();
    const socketId = body.get("socket_id") as string;
    const channelName = body.get("channel_name") as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id;
    const userName = session.user.name;

    const presenceData = {
      user_id: userId,
      user_info: {
        name: userName,
        // We'll update the role via API events,
        // but initial presence can hold basic info
      },
    };

    const authResponse = pusherServer.authorizeChannel(
      socketId,
      channelName,
      presenceData
    );
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
