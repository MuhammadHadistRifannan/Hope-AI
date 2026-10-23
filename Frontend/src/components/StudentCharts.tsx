import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

// Ringkasan kemajuan kelas dalam tiga grafik untuk Ruang Guru: sebaran nilai kuis, keaktifan,
// dan level Pathly yang sudah selesai. Warnanya biru, oranye, dan abu-abu (aman untuk buta
// warna), dan setiap grafik punya tabel tersembunyi berisi angka yang sama untuk pembaca layar.

export type ChartStudent = {
  averageScore: number | null;
  modulesCompleted: number;
  lastSeen: string | null;
};

const BLUE = "#2563eb";
const ORANGE = "#ea580c";
const GRAY = "#94a3b8";
const NAVY = "#1e3a8a";

const DAY = 24 * 3600 * 1000;

type Row = { label: string; value: number; color: string };

const scoreBins = (students: ChartStudent[]): Row[] => {
  const bins: Row[] = [
    { label: "Belum kuis", value: 0, color: GRAY },
    { label: "0–39", value: 0, color: ORANGE },
    { label: "40–59", value: 0, color: ORANGE },
    { label: "60–79", value: 0, color: BLUE },
    { label: "80–100", value: 0, color: BLUE },
  ];
  for (const { averageScore: score } of students) {
    const index = score === null ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;
    bins[index].value++;
  }
  return bins;
};

const activityGroups = (students: ChartStudent[]): Row[] => {
  const groups: Row[] = [
    { label: "Aktif 7 hari terakhir", value: 0, color: BLUE },
    { label: "8–30 hari lalu", value: 0, color: ORANGE },
    { label: "Lebih dari 30 hari / belum pernah", value: 0, color: GRAY },
  ];
  for (const { lastSeen } of students) {
    const days = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) / DAY : Infinity;
    groups[days <= 7 ? 0 : days <= 30 ? 1 : 2].value++;
  }
  return groups;
};

const moduleGroups = (students: ChartStudent[], total: number): Row[] => {
  const third = Math.max(1, Math.ceil(total / 3));
  const ranges: [number, number][] = [
    [1, third],
    [third + 1, third * 2],
    [third * 2 + 1, total - 1],
  ].filter(([from, to]) => from <= to) as [number, number][];
  const rows: Row[] = [
    { label: "Belum ada", value: 0, color: GRAY },
    ...ranges.map(([from, to]) => ({ label: from === to ? `${from}` : `${from}–${to}`, value: 0, color: BLUE })),
    { label: `Semua (${total})`, value: 0, color: NAVY },
  ];
  for (const { modulesCompleted: done } of students) {
    if (done <= 0) rows[0].value++;
    else if (total > 0 && done >= total) rows[rows.length - 1].value++;
    else {
      const index = ranges.findIndex(([from, to]) => done >= from && done <= to);
      if (index >= 0) rows[index + 1].value++;
    }
  }
  return rows;
};

const SrTable = ({ caption, rows }: { caption: string; rows: Row[] }) => (
  <table className="sr-only">
    <caption>{caption}</caption>
    <thead>
      <tr>
        <th scope="col">Kelompok</th>
        <th scope="col">Jumlah siswa</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.label}>
          <th scope="row">{row.label}</th>
          <td>{row.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ChartCard = ({ title, note, children }: { title: string; note: string; children: React.ReactNode }) => (
  <Card className="p-4 md:p-5">
    <h3 className="font-bold">{title}</h3>
    <p className="mb-3 text-sm text-muted-foreground">{note}</p>
    {children}
  </Card>
);

const BarRows = ({ rows, unit }: { rows: Row[]; unit: string }) => (
  <div className="h-56" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => [`${value} siswa`, unit]} cursor={{ fillOpacity: 0.1 }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.label} fill={row.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default function StudentCharts({ students, totalModules }: { students: ChartStudent[]; totalModules: number }) {
  if (students.length === 0) return null;
  const scores = scoreBins(students);
  const activity = activityGroups(students);
  const modules = moduleGroups(students, totalModules);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      <ChartCard title="Sebaran Nilai Kuis" note="Rata-rata nilai tiap siswa. Oranye: di bawah 60%.">
        <BarRows rows={scores} unit="Siswa" />
        <SrTable caption="Jumlah siswa per rentang rata-rata nilai kuis" rows={scores} />
      </ChartCard>

      <ChartCard title="Keaktifan Siswa" note="Kapan terakhir siswa belajar.">
        <div className="h-56" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={activity} dataKey="value" nameKey="label" innerRadius="50%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
                {activity.map((row) => (
                  <Cell key={row.label} fill={row.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} siswa`, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <SrTable caption="Jumlah siswa menurut waktu terakhir aktif" rows={activity} />
      </ChartCard>

      <ChartCard title="Kemajuan Pathly" note={`Jumlah level yang sudah selesai dari ${totalModules} level.`}>
        <BarRows rows={modules} unit="Siswa" />
        <SrTable caption="Jumlah siswa menurut banyaknya level Pathly yang selesai" rows={modules} />
      </ChartCard>
    </div>
  );
}
