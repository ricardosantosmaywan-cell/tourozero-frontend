import { createContext, useContext, useState, type ReactNode } from 'react';

interface PeriodContextType {
  selectedMonth: number;
  selectedYear: number;
  selectedDay: number | null; // null means whole month
  setPeriod: (month: number, year: number, day?: number | null) => void;
  startDate: string;
  endDate: string;
  isSpecificDay: boolean;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const setPeriod = (month: number, year: number, day: number | null = null) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setSelectedDay(day);
  };

  // Helper to get ISO strings
  const getPeriodRange = () => {
    if (selectedDay !== null) {
      const date = new Date(selectedYear, selectedMonth, selectedDay);
      const str = date.toISOString().split('T')[0];
      return { startStr: str, endStr: str };
    }

    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);
    
    // Format YYYY-MM-DD
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    return { startStr, endStr };
  };

  const { startStr, endStr } = getPeriodRange();

  return (
    <PeriodContext.Provider value={{ 
      selectedMonth, 
      selectedYear, 
      selectedDay,
      setPeriod, 
      startDate: startStr, 
      endDate: endStr,
      isSpecificDay: selectedDay !== null
    }}>
      {children}
    </PeriodContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePeriod() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
}
