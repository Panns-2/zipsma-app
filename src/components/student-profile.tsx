
import { UserCircle2, RefreshCw, GraduationCap, MapPin, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StudentProfileProps {
  name: string;
  studentClass: string;
  studentId: string;
  profilePicture?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onEdit: () => void;
  feeDiscount?: number;
}

export default function StudentProfile({ name, studentClass, studentId, profilePicture, onRefresh, isRefreshing, onEdit, feeDiscount }: StudentProfileProps) {
  return (
    <div className="mb-6 md:mb-24">
      {/* Banner */}
      <div className="h-40 md:h-64 w-full rounded-xl overflow-hidden relative shadow-md">
        <img 
          src="/student_hero.png" 
          alt="Dashboard Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Profile Card — stacks below banner on mobile, overlaps on md+ */}
      <div className="md:absolute md:left-1/2 md:-translate-x-1/2 md:-bottom-20 md:w-[95%] md:max-w-4xl -mt-6 md:mt-0 mx-3 md:mx-0 relative">
        <div className="bg-gradient-to-br from-[#1e1b4b] via-[#311042] to-[#111827] border-2 border-slate-400 p-5 md:p-8 rounded-xl shadow-2xl flex flex-col md:flex-row items-center md:items-end justify-between gap-4 md:gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 text-center md:text-left w-full md:w-auto">
             <div className="relative group flex-shrink-0">
                <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-white/10 shadow-xl ring-4 ring-white/5">
                    <AvatarImage src={profilePicture} alt={name} className="object-cover" />
                    <AvatarFallback className="bg-white/5">
                        <UserCircle2 className="w-12 h-12 md:w-16 md:h-16 text-white/40" />
                    </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 md:p-2 rounded-lg shadow-md border-2 border-[#1e1b4b]">
                    <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                </div>
             </div>
             <div className="space-y-1.5 md:space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                    <h2 className="text-2xl md:text-4xl font-black font-headline text-white tracking-tight">{name}</h2>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-3 py-1 rounded-md uppercase tracking-wider text-[10px]">
                        Active Student
                    </Badge>
                    {feeDiscount && feeDiscount > 0 ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold px-3 py-1 rounded-md uppercase tracking-wider text-[10px] animate-pulse">
                            {feeDiscount}% Fee Discount Applied
                        </Badge>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-slate-300 font-medium text-sm">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-400" /> {studentClass}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-emerald-400" /> ID: {studentId}</span>
                </div>
             </div>
          </div>
          
          <div className="flex gap-3 flex-shrink-0">
             <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl w-10 h-10 md:w-12 md:h-12 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white shadow-sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="rounded-xl px-5 md:px-6 bg-white hover:bg-slate-100 text-slate-950 font-bold shadow-lg shadow-white/5 h-10 md:h-12 text-sm md:text-base border-none" onClick={onEdit}>
                Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}