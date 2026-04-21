"use client";

import { Wind, Thermometer, Droplets, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface SensorCardProps {
  name: string;
  type: "temp" | "hum" | "co2" | "voc";
  value: string | number;
  unit: string;
  status: "good" | "warning" | "danger";
  lastUpdated: string;
}

export function SensorCard({ name, type, value, unit, status, lastUpdated }: SensorCardProps) {
  const getIcon = () => {
    switch (type) {
      case "temp": return <Thermometer className="h-6 w-6" />;
      case "hum": return <Droplets className="h-6 w-6" />;
      case "co2": return <Wind className="h-6 w-6" />;
      case "voc": return <Activity className="h-6 w-6" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "good": return "bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/30";
      case "warning": return "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/30";
      case "danger": return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/30";
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-6 rounded-3xl border shadow-sm transition-all bg-white dark:bg-slate-900 ${getStatusColor()}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${getStatusColor().split(' ')[0]} ${getStatusColor().split(' ')[1]}`}>
          {getIcon()}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Status</span>
          <span className="text-xs font-semibold">
            {status === "good" ? "Normal" : status === "warning" ? "Attention" : "Critique"}
          </span>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span>
          <span className="text-sm font-medium text-slate-500">{unit}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <span className="text-[10px] text-slate-400 uppercase">Dernière mise à jour</span>
        <span className="text-[10px] font-medium text-slate-500">{lastUpdated}</span>
      </div>
    </motion.div>
  );
}
