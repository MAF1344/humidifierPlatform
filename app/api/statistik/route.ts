import {NextResponse} from 'next/server';

const API_BASE = 'https://iot.finscloud.my.id';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/statistik`, {
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({error: 'Failed to fetch statistik'}, {status: 500});
  }
}
