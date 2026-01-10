import {NextResponse} from 'next/server';

const RELAY_API_URL = 'https://iot.finscloud.my.id/relay/1';

// GET - Fetch relay status
export async function GET() {
  try {
    const response = await fetch(RELAY_API_URL, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GET Error:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Relay GET Error:', error);
    return NextResponse.json({error: 'Failed to fetch relay status'}, {status: 500});
  }
}

// PUT - Update relay (mode or status)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    console.log('PUT Request Body:', body);

    const response = await fetch(RELAY_API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PUT Error Response:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('PUT Success:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Relay PUT Error:', error);
    return NextResponse.json({error: 'Failed to update relay', details: error instanceof Error ? error.message : 'Unknown error'}, {status: 500});
  }
}

// PATCH - Alternative update method
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    console.log('PATCH Request Body:', body);

    const response = await fetch(RELAY_API_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PATCH Error Response:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('PATCH Success:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Relay PATCH Error:', error);
    return NextResponse.json({error: 'Failed to update relay', details: error instanceof Error ? error.message : 'Unknown error'}, {status: 500});
  }
}
