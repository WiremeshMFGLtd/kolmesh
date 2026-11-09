"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-steel-200 bg-white px-3 py-2 text-[13px] shadow-lift">
      <p className="font-semibold">{label ? fmtDay(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 flex items-center gap-2 text-steel-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name}: <span className="font-semibold text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TrafficChart({ data }: { data: { day: string; views: number; enquiries: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#196ba3" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#196ba3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickFormatter={fmtDay} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<Tip />} cursor={{ stroke: "#dce2e8" }} />
        <Area type="monotone" dataKey="views" name="Page views" stroke="#196ba3" strokeWidth={2} fill="url(#views)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EnquiryBars({ data }: { data: { day: string; enquiries: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Tooltip content={<Tip />} cursor={{ fill: "#f5f7f9" }} />
        <XAxis dataKey="day" hide />
        <Bar dataKey="enquiries" name="Enquiries" fill="#10151c" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
