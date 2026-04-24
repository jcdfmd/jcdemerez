import AdagiumClient from './AdagiumClient';
import { getAphorisms, Aphorism } from '@/lib/aphorisms';

export const dynamic = 'force-dynamic';

export default async function AdagiumPage() {
  const data = getAphorisms();
  
  let initialAphorism: Aphorism;

  if (data.todayCount > 0) {
    const randomTodayIndex = Math.floor(Math.random() * data.todayCount);
    initialAphorism = data.todayAphorisms[randomTodayIndex];
  } else if (data.allAphorisms.length > 0) {
    const randomIndex = Math.floor(Math.random() * data.allAphorisms.length);
    initialAphorism = data.allAphorisms[randomIndex];
  } else {
    initialAphorism = { id: 'none', content: "No hay reflexiones en la bóveda todavía." };
  }

  return (
    <AdagiumClient 
      initialAphorism={initialAphorism} 
      lastUpdate={data.lastUpdate} 
      todayCount={data.todayCount} 
    />
  );
}
