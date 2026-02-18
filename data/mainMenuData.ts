
import {
    QuranIcon, SalahAdhkarIcon, ListenIcon, TasbeehIcon, CalendarIcon, QiblaIcon,
    HajjIcon, HisnMuslimIcon, PrayerTimesIcon, AdiaIcon, SabahMasaaIcon
} from '../components/Icons';

export const verses = [
  { text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", surah: "سورة الشرح", number: "٥" },
  { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", surah: "سورة الرعد", number: "٢٨" },
  { text: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ", surah: "سورة هود", number: "٨٨" },
];

export const navItems = [
  { id: 'quran', title: "القرآن الكريم", icon: QuranIcon, isFeatured: true },
  { id: 'sabah-masaa', title: "أذكار الصباح والمساء", icon: SabahMasaaIcon },
  { id: 'adia', title: "أدعية", icon: AdiaIcon },
  { id: 'tasbeeh', title: "التسبيح", icon: TasbeehIcon },
  { id: 'salah-adhkar', title: "أذكار الصلاة", icon: SalahAdhkarIcon },
  { id: 'prayer-times', title: "مواقيت الصلاة", icon: PrayerTimesIcon },
  { id: 'qibla', title: "القبلة", icon: QiblaIcon },
  { id: 'hajj-umrah', title: "الحج والعمرة", icon: HajjIcon },
  { id: 'hisn-muslim', title: "حصن المسلم", icon: HisnMuslimIcon },
  { id: 'listen', title: "الاستماع للقرآن", icon: ListenIcon },
  { id: 'calendar', title: "التقويم", icon: CalendarIcon },
];
