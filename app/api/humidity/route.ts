import {NextResponse} from 'next/server';

const API_BASE = 'https://iot.finscloud.my.id';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/humidity`, {
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({error: 'Failed to fetch humidity'}, {status: 500});
  }
}
