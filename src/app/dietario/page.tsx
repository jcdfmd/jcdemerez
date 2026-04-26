import DietarioClient from './DietarioClient';
import { getAphorisms, Aphorism } from '@/lib/aphorisms';

export const dynamic = 'force-dynamic';

export default async function DietarioPage() {
  const data = getAphorisms('dietario');
  
  let initialEntry: Aphorism;

  if (data.todayCount > 0) {
    const randomTodayIndex = Math.floor(Math.random() * data.todayCount);
    initialEntry = data.todayAphorisms[randomTodayIndex];
  } else if (data.allAphorisms.length > 0) {
    const randomIndex = Math.floor(Math.random() * data.allAphorisms.length);
    initialEntry = data.allAphorisms[randomIndex];
  } else {
    initialEntry = { id: 'none', content: "No hay entradas en el dietario todavía.", type: 'dietario' };
  }

  return (
    <DietarioClient 
      initialEntry={initialEntry} 
      todayCount={data.todayCount} 
    />
  );
}
