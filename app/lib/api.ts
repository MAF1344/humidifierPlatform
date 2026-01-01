const API_BASE = 'https://iot.finscloud.my.id';

export async function getLatestCelcius() {
  const res = await fetch('/api/celcius', {cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to fetch celcius');

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return null;

  return data.reduce((latest, item) => (new Date(item.time) > new Date(latest.time) ? item : latest));
}

export async function getLatestHumidity() {
  const res = await fetch('/api/humidity', {cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to fetch humidity');

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return null;

  return data.reduce((latest, item) => (new Date(item.time) > new Date(latest.time) ? item : latest));
}

export async function toggleDevice(state: 'on' | 'off') {
  const res = await fetch(`${API_BASE}/device/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({state}),
  });
  if (!res.ok) throw new Error('Failed to toggle device');
  return await res.json();
}

export async function getDeviceStatus() {
  const res = await fetch(`${API_BASE}/device/status`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch device status');
  return await res.json();
}

export async function getStatistik() {
  const res = await fetch('/api/statistik');
  if (!res.ok) throw new Error('Failed to fetch statistik');
  return res.json(); // returns array directly
}

export async function getRawCelcius() {
  const res = await fetch('/api/celcius', {cache: 'no-store'});
  if (!res.ok) throw new Error('Failed fetch celcius');
  return res.json();
}

export async function getRawHumidity() {
  const res = await fetch('/api/humidity', {cache: 'no-store'});
  if (!res.ok) throw new Error('Failed fetch humidity');
  return res.json();
}
