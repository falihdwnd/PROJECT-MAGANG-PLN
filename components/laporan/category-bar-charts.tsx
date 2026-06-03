"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Warna untuk kategori kontrak (vibrant for visibility)
const CONTRACT_CATEGORY_COLORS: Record<string, string> = {
  investasi: "#8b5cf6",      // violet
  pemeliharaan: "#f97316",   // orange
  administrasi: "#0ea5e9",   // sky blue
};

interface ContractCategoryData {
  kategori: string;
  label: string;
  totalKontrak: number;
  kontrakAktif: number;
  totalNilai: number;
  totalDibayar: number;
  sisaAnggaran: number;
  persentaseRealisasi: number;
}

interface CategoryBarChartsProps {
  contractData: ContractCategoryData[];
}

// Custom tooltip untuk kontrak - professional styling for light/dark mode
const ContractTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-2xl">
        <p className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-300">
          {label}
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-600">Pagu:</span>
            <span className="font-semibold text-gray-800">{formatCurrency(data.totalNilai)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-600">Realisasi:</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(data.totalDibayar)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-600">Sisa:</span>
            <span className="font-semibold text-blue-700">{formatCurrency(data.sisaAnggaran)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 pt-2 border-t border-gray-200">
            <span className="text-gray-600">Kontrak:</span>
            <span className="font-semibold text-gray-800">{data.totalKontrak} <span className="text-xs text-gray-500">({data.kontrakAktif} aktif)</span></span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Legend Component for better dark mode support
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex justify-center gap-6 mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600 font-medium">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function CategoryBarCharts({ contractData }: CategoryBarChartsProps) {
  // Transform data untuk kontrak chart
  const contractChartData = contractData.map((cat) => ({
    name: cat.label,
    kategori: cat.kategori,
    totalNilai: cat.totalNilai,
    totalDibayar: cat.totalDibayar,
    sisaAnggaran: cat.sisaAnggaran,
    totalKontrak: cat.totalKontrak,
    kontrakAktif: cat.kontrakAktif,
    persentaseRealisasi: cat.persentaseRealisasi,
  }));

  return (
    <Card hover={false} className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>
          <span className="text-lg font-semibold text-gray-900">Kontrak per Kategori</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={contractChartData} 
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="paguGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="#e5e7eb"
                className=""
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={false}
                height={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 11, 
                  fill: '#9ca3af',
                }}
                className=""
                tickFormatter={(value) => {
                  if (value >= 1000000000) return `${(value / 1000000000).toFixed(0)}M`;
                  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
                  return value.toString();
                }}
                width={50}
              />
              <Tooltip 
                content={<ContractTooltip />} 
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Legend content={<CustomLegend />} />
              <Bar 
                dataKey="totalNilai" 
                name="Pagu" 
                fill="url(#paguGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="totalDibayar" 
                name="Realisasi" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              >
                {contractChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CONTRACT_CATEGORY_COLORS[entry.kategori] || '#6b7280'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>


      </CardContent>
    </Card>
  );
}

// Export konstanta warna untuk digunakan di PDF dan komponen lain
export { CONTRACT_CATEGORY_COLORS };
