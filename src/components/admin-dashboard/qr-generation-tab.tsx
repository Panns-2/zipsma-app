'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { getStudents, Student } from '@/lib/data-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, Search } from 'lucide-react';
import QRCode from "react-qr-code";

interface QRGenerationTabProps {
    schoolId: string;
    schoolName?: string;
}

export default function QRGenerationTab({ schoolId, schoolName }: QRGenerationTabProps) {
    const { db } = useFirebase();
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [templateStyle, setTemplateStyle] = useState<'standard' | 'custom'>('standard');

    useEffect(() => {
        async function fetchStudents() {
            setIsLoading(true);
            try {
                const data = await getStudents(db, schoolId);
                setStudents(data);
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setIsLoading(false);
            }
        }
        if (schoolId) fetchStudents();
    }, [schoolId, db]);

    const filteredStudents = students.filter(student => 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.className.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading students...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="p-6 bg-card border shadow-sm print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">QR Check-In Cards</h2>
                        <p className="text-muted-foreground mt-1">
                            Generate and print QR code ID cards for students to use with the scanner.
                        </p>
                    </div>
                <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <div className="bg-muted p-1 rounded-lg flex text-sm">
                            <button 
                                onClick={() => setTemplateStyle('standard')}
                                className={`px-3 py-1.5 rounded-md transition-all ${templateStyle === 'standard' ? 'bg-white shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Standard QR
                            </button>
                            <button 
                                onClick={() => setTemplateStyle('custom')}
                                className={`px-3 py-1.5 rounded-md transition-all ${templateStyle === 'custom' ? 'bg-white shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Custom Template
                            </button>
                        </div>
                        <Button onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print View
                        </Button>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            </Card>

            {/* Print specific styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 10mm; }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}} />

            <div id="print-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStudents.map((student) => {
                    const qrPayload = student.id || `${schoolId.toUpperCase()}_${student.studentId.toUpperCase()}`;
                    
                    if (templateStyle === 'custom') {
                        const templatePath = schoolName?.includes('Panns') 
                            ? '/Panns/School ID (Panns) 2.png' 
                            : `/${schoolName}/School ID (${schoolName}).png`;

                        return (
                            <div key={student.id || student.studentId} className="relative overflow-hidden rounded-[16px] border shadow-sm print:shadow-none print:border-none break-inside-avoid" style={{ aspectRatio: '3.37/2.12', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
                                {/* Background Template */}
                                <img src={templatePath} alt="ID Template" className="absolute inset-0 w-full h-full object-fill z-0" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.classList.add('bg-slate-100'); }} />
                                
                                {/* Photo Container - Aligned precisely with the blue frame */}
                                <div className="absolute z-10 overflow-hidden" style={{ top: '29%', left: '9%', width: '23.5%', height: '49%', borderRadius: '12px' }}>
                                    {student.profilePicture ? (
                                        <img src={student.profilePicture} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200/80 flex flex-col items-center justify-center">
                                            <span className="text-slate-500 text-[10px] font-medium">No Photo</span>
                                        </div>
                                    )}
                                </div>

                                {/* Text Overlays - Positioned precisely on the template's lines */}
                                {/* Student Name */}
                                <div className="absolute z-10 w-[58%]" style={{ top: '38%', left: '36%' }}>
                                    <h3 className="font-extrabold text-[13px] text-[#00205c] leading-tight uppercase truncate">{student.name}</h3>
                                </div>
                                
                                {/* Student ID */}
                                <div className="absolute z-10" style={{ top: '51%', left: '36%' }}>
                                    <p className="font-bold text-[12px] text-[#00205c] tracking-wider uppercase">{student.studentId}</p>
                                </div>

                                {/* Issue Date */}
                                <div className="absolute z-10" style={{ top: '63%', left: '36%' }}>
                                    <p className="font-bold text-[11px] text-[#00205c] uppercase">
                                        {student.dateAdded ? new Date(student.dateAdded).toLocaleDateString('en-GB') : 'N/A'}
                                    </p>
                                </div>

                                {/* Expiry Date */}
                                <div className="absolute z-10" style={{ top: '75%', left: '36%' }}>
                                    <p className="font-bold text-[11px] text-[#00205c] uppercase">
                                        {student.dateAdded ? new Date(new Date(student.dateAdded).setFullYear(new Date(student.dateAdded).getFullYear() + 1)).toLocaleDateString('en-GB') : 'N/A'}
                                    </p>
                                </div>

                                {/* Class Badge */}
                                <div className="absolute z-10" style={{ top: '23%', right: '3%' }}>
                                    <span className="bg-white border border-[#00205c]/20 text-[#00205c] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm">
                                        {student.className}
                                    </span>
                                </div>
                                
                                {/* QR Code */}
                                <div className="absolute z-10 bg-white p-0.5 rounded-md shadow-sm" style={{ top: '54%', right: '3%' }}>
                                    <QRCode value={qrPayload} size={36} level="L" />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <Card key={student.id || student.studentId} className="overflow-hidden border-2 print:border print:break-inside-avoid print:shadow-none">
                            <CardHeader className="text-center pb-2 bg-muted/50 print:bg-transparent">
                                <CardTitle className="text-lg">{student.name}</CardTitle>
                                <CardDescription>{student.className} • {student.studentId}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center pt-6 pb-6">
                                <div className="bg-white p-3 rounded-xl shadow-sm border">
                                    <QRCode 
                                        value={qrPayload} 
                                        size={150}
                                        level="H"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-4 text-center">
                                    Scan to mark attendance
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
                {filteredStudents.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground print:hidden">
                        No students found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}
