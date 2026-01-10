'use client';

import {useEffect, useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {getLatestCelcius, getLatestHumidity, getRawCelcius, getRawHumidity} from '@/app/lib/api';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';

type Range = 'daily' | 'weekly' | 'monthly';

type ChartPoint = {
  time: string;
  celcius: number | null;
  humidity: number | null;
};

type RelayData = {
  id: number;
  reported_status: 'ON' | 'OFF';
  mode: 'AUTO' | 'MANUAL';
  manual_since: string;
  updated_at: string;
};

// Gunakan API route lokal sebagai proxy
const RELAY_API_URL = '/api/relay';

export default function Dashboard() {
  const [selectedRange, setSelectedRange] = useState<Range>('weekly');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  // State untuk relay dari API
  const [relayMode, setRelayMode] = useState<'AUTO' | 'MANUAL'>('MANUAL');
  const [relayStatus, setRelayStatus] = useState<'ON' | 'OFF'>('OFF');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function getTemperatureStatus(value: number | null) {
    if (value === null) return 'Tidak Ada Data';
    if (value < 20) return 'Rendah (Tidak Aman)';
    if (value <= 30) return 'Aman';
    return 'Tinggi (Tidak Aman)';
  }

  function getHumidityStatus(value: number | null) {
    if (value === null) return 'Tidak Ada Data';
    if (value < 30) return 'Kering (Tidak Aman)';
    if (value <= 60) return 'Aman';
    return 'Lembap (Tidak Aman)';
  }

  function filterByRange(data: any[], range: Range) {
    const now = Date.now();

    const rangeMap: Record<Range, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const limit = rangeMap[range];

    return data.filter((item) => {
      const time = new Date(item.time ?? item.created_at).getTime();
      return now - time <= limit;
    });
  }

  function formatXAxis(time: string, mode: Range) {
    const date = new Date(time);

    if (mode === 'daily') {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (mode === 'weekly') {
      return date.toLocaleDateString('id-ID', {
        weekday: 'short',
      });
    }

    if (mode === 'monthly') {
      const weekOfMonth = Math.ceil(date.getDate() / 7);
      return `Week ${weekOfMonth}`;
    }

    return '';
  }

  function mergeSensorData(celArr: any[], humArr: any[]) {
    return celArr.map((cel) => {
      const celTime = new Date(cel.time ?? cel.created_at).getTime();

      const hum = humArr.find((h) => {
        const humTime = new Date(h.time ?? h.created_at).getTime();
        return Math.abs(humTime - celTime) <= 5 * 60 * 1000;
      });

      return {
        time: new Date(celTime).toISOString(),
        celcius: cel.value ?? cel.degrees,
        humidity: hum?.value ?? hum?.percent ?? null,
      };
    });
  }

  // ===== FETCH RELAY STATUS =====
  async function fetchRelayStatus() {
    try {
      setFetchError(null);
      const response = await fetch(RELAY_API_URL, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RelayData = await response.json();
      setRelayMode(data.mode);
      setRelayStatus(data.reported_status);
    } catch (error) {
      console.error('Error fetching relay status:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch');
    }
  }

  // ===== UPDATE RELAY MODE (AUTO/MANUAL) =====
  async function updateRelayMode(newMode: 'AUTO' | 'MANUAL') {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(RELAY_API_URL, {
        method: 'PATCH', // Changed from PUT to PATCH
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: newMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RelayData = await response.json();
      setRelayMode(data.mode);
      setRelayStatus(data.reported_status);
    } catch (error) {
      console.error('Error updating relay mode:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to update');
      // Rollback on error
      await fetchRelayStatus();
    } finally {
      setIsLoading(false);
    }
  }

  // ===== UPDATE RELAY STATUS (ON/OFF) =====
  async function updateRelayStatus(newStatus: 'ON' | 'OFF') {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(RELAY_API_URL, {
        method: 'PATCH', // Changed from PUT to PATCH
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reported_status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RelayData = await response.json();
      setRelayMode(data.mode);
      setRelayStatus(data.reported_status);
    } catch (error) {
      console.error('Error updating relay status:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to update');
      // Rollback on error
      await fetchRelayStatus();
    } finally {
      setIsLoading(false);
    }
  }

  // ===== HANDLE MODE TOGGLE =====
  function handleModeToggle() {
    const newMode = relayMode === 'AUTO' ? 'MANUAL' : 'AUTO';
    updateRelayMode(newMode);
  }

  // ===== HANDLE STATUS TOGGLE =====
  function handleStatusToggle() {
    if (relayMode !== 'MANUAL') return;
    const newStatus = relayStatus === 'ON' ? 'OFF' : 'ON';
    updateRelayStatus(newStatus);
  }

  // ===== FETCH CHART DATA =====
  useEffect(() => {
    async function fetchChartData() {
      try {
        const [celRaw, humRaw] = await Promise.all([getRawCelcius(), getRawHumidity()]);

        const celFiltered = filterByRange(celRaw, selectedRange);
        const humFiltered = filterByRange(humRaw, selectedRange);

        const merged = mergeSensorData(celFiltered, humFiltered);

        merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        setChartData(merged);
        console.log(selectedRange, 'jumlah data:', merged.length);
      } catch (err) {
        console.error(err);
      }
    }

    fetchChartData();
  }, [selectedRange]);

  // ===== FETCH LATEST SENSOR DATA =====
  useEffect(() => {
    async function fetchLatest() {
      try {
        const [cel, hum] = await Promise.all([getLatestCelcius(), getLatestHumidity()]);

        setTemperature(cel?.degrees ?? null);
        setHumidity(hum?.percent ?? null);
      } catch (error) {
        console.error('Error fetching latest:', error);
      }
    }

    fetchLatest();
  }, []);

  // ===== FETCH RELAY STATUS ON MOUNT =====
  useEffect(() => {
    fetchRelayStatus();

    // Poll relay status setiap 5 detik
    const interval = setInterval(fetchRelayStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black p-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-white">
        {/* TEMPERATURE */}
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Derajat</h2>
            <p className="text-4xl mt-4">{temperature !== null ? `${temperature} °C` : '--'}</p>
            <p className="text-sm text-zinc-400 mt-2">{getTemperatureStatus(temperature)}</p>
          </CardContent>
        </Card>

        {/* HUMIDITY */}
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Persen</h2>
            <p className="text-4xl mt-4">{humidity !== null ? `${humidity} %` : '--'}</p>
            <p className="text-sm text-zinc-400 mt-2">{getHumidityStatus(humidity)}</p>
          </CardContent>
        </Card>

        {/* RELAY */}
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">Toggle</h2>

            <div className="flex items-center justify-center gap-4">
              {/* AUTO / MANUAL */}
              <Button
                onClick={handleModeToggle}
                disabled={isLoading}
                className={`w-32 transition-colors ${relayMode === 'AUTO' ? 'bg-[#60a5fa] text-white hover:bg-[#3b82f6]' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {relayMode}
              </Button>

              {/* ON / OFF - Only show in MANUAL mode */}
              {relayMode === 'MANUAL' && (
                <div className="flex justify-center">
                  <button
                    disabled={isLoading}
                    onClick={handleStatusToggle}
                    className={`relative w-16 h-8 rounded-full transition-colors ${isLoading ? 'bg-zinc-600 cursor-not-allowed' : relayStatus === 'ON' ? 'bg-[#4ade80]' : 'bg-zinc-700'}`}>
                    <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${relayStatus === 'ON' ? 'translate-x-8' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Status text - Show different info based on mode */}
            <p className="text-sm text-zinc-400">
              {relayMode === 'AUTO' ? (
                <>Mode: {relayMode} (Otomatis)</>
              ) : (
                <>
                  Mode: {relayMode} | Status: {relayStatus}
                </>
              )}
            </p>

            {isLoading && <p className="text-xs text-blue-400">Updating...</p>}

            {fetchError && <p className="text-xs text-red-400">Error: {fetchError}</p>}
          </CardContent>
        </Card>
      </section>

      {/* DISTRIBUTION */}
      <section>
        <Card className="bg-zinc-900 border-zinc-800 min-h-[350px] p-6">
          <CardContent className="h-full w-full p-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-white">Distribusi Data</h2>

              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as Range[]).map((range) => {
                  const isActive = selectedRange === range;

                  return (
                    <Button
                      key={range}
                      size="sm"
                      variant={isActive ? 'outline' : 'default'}
                      onClick={() => setSelectedRange(range)}
                      className={`transition-all duration-200 hover:scale-105 ${isActive ? 'hover:bg-gray-100 hover:text-gray-900' : 'hover:bg-gray-800'}`}>
                      {range}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="h-[260px] w-full">
              {chartData.length === 0 ? (
                <p className="text-zinc-400 text-center mt-20">Tidak ada data untuk periode ini</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" tickFormatter={(value) => formatXAxis(value, selectedRange)} stroke="#888" minTickGap={20} />
                    <YAxis domain={[-50, 200]} stroke="#888" />
                    <Tooltip />
                    <Line type="natural" dataKey="celcius" stroke="#4ade80" strokeWidth={2} dot={false} />
                    <Line type="natural" dataKey="humidity" stroke="#60a5fa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
