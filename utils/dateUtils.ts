
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
