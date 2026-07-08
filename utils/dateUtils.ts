
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSameMonth } from 'date-fns';

export const getFortnightDays = (year: number, month: number, fortnight: 'first' | 'second') => {
  const start = fortnight === 'first' 
    ? new Date(year, month, 1) 
    : new Date(year, month, 16);
  
  const end = fortnight === 'first'
    ? new Date(year, month, 15)
    : endOfMonth(new Date(year, month, 1));

  return eachDayOfInterval({ start, end });
};

export const formatDate = (date: Date) => format(date, 'dd.MM.yyyy');
export const formatDay = (date: Date) => format(date, 'EEEE');
export const to24hDot = (time: string): string => {
  if (!time) return "";
  return time.replace(':', '.');
};

export const isMonthCompleted = (year: number, month: number, activities: any[]): boolean => {
  if (!activities || activities.length === 0) return false;
  const monthStr = String(month + 1).padStart(2, '0');
  const yearStr = String(year);
  
  const monthActs = activities.filter(act => {
    if (!act || !act.date) return false;
    const parts = act.date.split('.');
    return parts.length === 3 && parts[1] === monthStr && parts[2] === yearStr;
  });

  const uniqueDays = new Set(monthActs.map(act => act.date.split('.')[0]));
  return uniqueDays.size >= 20;
};
