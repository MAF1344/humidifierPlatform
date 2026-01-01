'use client';

import {useEffect, useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {getLatestCelcius, getLatestHumidity, getStatistik, getRawCelcius, getRawHumidity} from '@/app/lib/api';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';

type Range = 'daily' | 'weekly' | 'monthly';

type StatItem = {
  time: string;
  value: number;
};

type ChartPoint = {
  time: string;
  celcius: number | null;
  humidity: number | null;
};

function getLatestByTime<T extends {time: string}>(arr: T[]): T | null {
  if (!arr.length) return null;

  return arr.reduce((latest, item) => (new Date(item.time) > new Date(latest.time) ? item : latest));
}

export default function Dashboard() {
  const [selectedRange, setSelectedRange] = useState<Range>('weekly');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

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
      daily: 24 * 60 * 60 * 1000, // 24 jam
      weekly: 7 * 24 * 60 * 60 * 1000, // 7 hari
      monthly: 30 * 24 * 60 * 60 * 1000, // 30 hari
    };

    const limit = rangeMap[range];

    return data.filter((item) => {
      const time = new Date(item.time ?? item.created_at).getTime();

      return now - time <= limit;
    });
  }

  function mergeSensorData(celArr: any[], humArr: any[]) {
    return celArr.map((cel) => {
      const hum = humArr.find((h) => new Date(h.time ?? h.created_at).getTime() === new Date(cel.time ?? cel.created_at).getTime());

      return {
        time: cel.time ?? cel.created_at,
        celcius: cel.value ?? cel.degrees,
        humidity: hum?.value ?? hum?.percent ?? null,
      };
    });
  }

  useEffect(() => {
    async function fetchChartData() {
      try {
        const [celRaw, humRaw] = await Promise.all([getRawCelcius(), getRawHumidity()]);

        const celFiltered = filterByRange(celRaw, selectedRange);
        const humFiltered = filterByRange(humRaw, selectedRange);

        const merged = mergeSensorData(celFiltered, humFiltered);

        merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        setChartData(merged);
        // console.log('chartData merged:', merged);
        console.log(selectedRange, 'jumlah data:', merged.length);
      } catch (err) {
        console.error(err);
      }
    }

    fetchChartData();
  }, [selectedRange]);

  // ===== FETCH LATEST CARD DATA =====
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
  // console.log('chartData state:', chartData);

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

        {/* RELAY (DUMMY) */}
        <Card className="bg-zinc-900 border-zinc-800 flex items-center justify-center text-white">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Toggle</h2>
            <Button variant="outline" className="text-zinc-400">
              OFF
            </Button>
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
                {(['daily', 'weekly', 'monthly'] as Range[]).map((range) => (
                  <Button key={range} size="sm" variant={selectedRange === range ? 'default' : 'outline'} onClick={() => setSelectedRange(range)}>
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-[260px] w-full">
              {chartData.length === 0 ? (
                <p className="text-zinc-400 text-center mt-20">Tidak ada data untuk periode ini</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Line type="monotone" dataKey="celcius" stroke="#4ade80" strokeWidth={2} />
                    <Line type="monotone" dataKey="humidity" stroke="#60a5fa" strokeWidth={2} />
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
