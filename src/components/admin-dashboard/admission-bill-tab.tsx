import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Plus, Trash2, Phone, MessageSquare, Mail, GraduationCap, FileText, Shirt, PenTool, Droplet, Book, ClipboardList, Utensils, BookOpen, Wallet, AlertCircle, Loader2, Save, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School, getStudents, getAdmissionBill, saveAdmissionBill, AdmissionBillConfig, uploadAdmissionBillPdf } from '@/lib/data-store';
import { useFirebase } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { FaWhatsapp } from 'react-icons/fa'; // Assuming react-icons is available, otherwise will fallback
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStorage } from 'firebase/storage';

interface AdmissionBillTabProps {
    schoolDetails: School | null;
}

interface BillItem {
    id: string;
    name: string;
    amount: number;
}

interface BillCategory {
    id: string;
    title: string;
    items: BillItem[];
}

const defaultCategories: BillCategory[] = [
    {
        id: 'admission',
        title: 'ADMISSION',
        items: [
            { id: '1', name: 'Forms and Registration', amount: 70 },
            { id: '2', name: 'Tuition Fees', amount: 400 },
        ]
    },
    {
        id: 'uniforms',
        title: 'UNIFORMS',
        items: [
            { id: '3', name: 'School uniform (White & Blue)', amount: 140 },
            { id: '4', name: 'School uniform (Blue & Blue-black)', amount: 140 },
            { id: '5', name: 'Lacoste', amount: 80 },
        ]
    },
    {
        id: 'stationery',
        title: 'STATIONERY',
        items: [
            { id: '6', name: 'Writing & Art Materials (Termly)', amount: 50 },
            { id: '7', name: 'Text & Exercise Books (Yearly)', amount: 700 },
        ]
    }
];

const defaultExtraItems = [
    { id: '8', name: 'Toiletries (Termly)', amount: 95, icon: 'Droplet' },
    { id: '9', name: 'Report Booklet (Yearly)', amount: 35, icon: 'Book' },
    { id: '10', name: 'Examination Fee (Termly)', amount: 25, icon: 'ClipboardList' },
];

const DEFAULT_FEEDING = 'Feeding (daily)\n₵15 (Breakfast & Lunch)';
const DEFAULT_REMEDY = 'Remedy Teaching\n(Daily extra classes) ₵2';
const DEFAULT_PAYMENT_MODE = 'in cash or by MoMo (0545 203 743 - Priscilla Ansu)';
const DEFAULT_NOTES = 'If you have questions about payment methods, installment plans, due dates,\nor any financial concerns, we are here to assist.';
const DEFAULT_FOOTER = 'FEES PAID ARE NOT REFUNDABLE OR TRANSFERRED TO ANOTHER CHILD.';

export function AdmissionBillTab({ schoolDetails }: AdmissionBillTabProps) {
    const services = useFirebase();
    console.log("Firebase Services in AdmissionBillTab:", services);
    const { db, app, storage } = services;
    const { toast } = useToast();
    const [classList, setClassList] = useState<string[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingBill, setIsLoadingBill] = useState(false);
    const [parentWhatsApp, setParentWhatsApp] = useState('');
    const [isSending, setIsSending] = useState(false);

    const [className, setClassName] = useState('KINDERGARTEN 1');
    const [categories, setCategories] = useState<BillCategory[]>(defaultCategories);
    const [extraItems, setExtraItems] = useState(defaultExtraItems);

    const [feedingText, setFeedingText] = useState(DEFAULT_FEEDING);
    const [remedyText, setRemedyText] = useState(DEFAULT_REMEDY);
    const [paymentModeText, setPaymentModeText] = useState(DEFAULT_PAYMENT_MODE);
    const [notesText, setNotesText] = useState(DEFAULT_NOTES);
    const [footerText, setFooterText] = useState(DEFAULT_FOOTER);

    useEffect(() => {
        const fetchClasses = async () => {
            if (!schoolDetails?.id || !db) return;
            try {
                const students = await getStudents(db, schoolDetails.id);
                const uniqueClasses = Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort();
                const allClasses = Array.from(new Set([...uniqueClasses, 'Creche'])).sort();
                setClassList(allClasses);
                if (allClasses.length > 0 && !selectedClass) {
                    setSelectedClass(allClasses[0]);
                }
            } catch (err) {
                console.error("Failed to load classes", err);
            } finally {
                setIsLoadingClasses(false);
            }
        };
        fetchClasses();
    }, [schoolDetails?.id, db]);

    useEffect(() => {
        const fetchBill = async () => {
            if (!schoolDetails?.id || !selectedClass || !db) return;
            setIsLoadingBill(true);
            try {
                const bill = await getAdmissionBill(db, schoolDetails.id, selectedClass);
                setClassName(selectedClass);
                if (bill) {
                    setCategories(bill.categories || defaultCategories);
                    setExtraItems(bill.extraItems || defaultExtraItems);
                    setFeedingText(bill.feedingText !== undefined ? bill.feedingText : DEFAULT_FEEDING);
                    setRemedyText(bill.remedyText !== undefined ? bill.remedyText : DEFAULT_REMEDY);
                    setPaymentModeText(bill.paymentModeText !== undefined ? bill.paymentModeText : DEFAULT_PAYMENT_MODE);
                    setNotesText(bill.notesText !== undefined ? bill.notesText : DEFAULT_NOTES);
                    setFooterText(bill.footerText !== undefined ? bill.footerText : DEFAULT_FOOTER);
                } else {
                    // No saved bill for this class yet — use the default template silently
                    setCategories(defaultCategories);
                    setExtraItems(defaultExtraItems);
                    setFeedingText(DEFAULT_FEEDING);
                    setRemedyText(DEFAULT_REMEDY);
                    setPaymentModeText(DEFAULT_PAYMENT_MODE);
                    setNotesText(DEFAULT_NOTES);
                    setFooterText(DEFAULT_FOOTER);
                }
            } catch (err: any) {
                console.error('Error loading bill (full error):', err);
                const errMsg = err?.message || err?.code || 'Unknown error';
                // Only show error for real failures, not missing docs
                if (err?.code !== 'not-found') {
                    toast({ title: 'Error loading bill', description: errMsg, variant: 'destructive' });
                } else {
                    setCategories(defaultCategories);
                    setExtraItems(defaultExtraItems);
                    setFeedingText(DEFAULT_FEEDING);
                    setRemedyText(DEFAULT_REMEDY);
                    setPaymentModeText(DEFAULT_PAYMENT_MODE);
                    setNotesText(DEFAULT_NOTES);
                    setFooterText(DEFAULT_FOOTER);
                }
            } finally {
                setIsLoadingBill(false);
            }
        };
        fetchBill();
    }, [selectedClass, schoolDetails?.id, db, toast]);

    const handleSaveBill = async () => {
        if (!schoolDetails?.id || !selectedClass) {
            toast({ title: 'Select a class', description: 'Please select a class before saving.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            await saveAdmissionBill(db, {
                schoolId: schoolDetails.id,
                className: selectedClass,
                categories,
                extraItems,
                feedingText,
                remedyText,
                paymentModeText,
                notesText,
                footerText
            });
            toast({ title: 'Bill Saved', description: `Admission bill for ${selectedClass} saved successfully.` });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to save admission bill.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const updateItem = (categoryId: string, itemId: string, field: 'name' | 'amount', value: string | number) => {
        setCategories(cats => cats.map(cat => {
            if (cat.id !== categoryId) return cat;
            return {
                ...cat,
                items: cat.items.map(item => {
                    if (item.id !== itemId) return item;
                    return { ...item, [field]: value };
                })
            };
        }));
    };
    
    const updateExtraItem = (itemId: string, field: 'name' | 'amount', value: string | number) => {
        setExtraItems(items => items.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, [field]: value };
        }));
    };

    const addItem = (categoryId: string) => {
        setCategories(cats => cats.map(cat => {
            if (cat.id !== categoryId) return cat;
            return {
                ...cat,
                items: [...cat.items, { id: Math.random().toString(), name: 'New Item', amount: 0 }]
            };
        }));
    };

    const removeItem = (categoryId: string, itemId: string) => {
        setCategories(cats => cats.map(cat => {
            if (cat.id !== categoryId) return cat;
            return {
                ...cat,
                items: cat.items.filter(item => item.id !== itemId)
            };
        }));
    };

    const addExtraItem = () => {
        setExtraItems(items => [
            ...items,
            { id: Math.random().toString(), name: 'New Extra Item', amount: 0, icon: 'FileText' }
        ]);
    };

    const removeExtraItem = (itemId: string) => {
        setExtraItems(items => items.filter(item => item.id !== itemId));
    };

    const handleSend = async (method: 'whatsapp' | 'sms' = 'whatsapp') => {
        if (!parentWhatsApp.trim()) {
            toast({ title: 'Phone Number Required', description: "Please enter the parent's phone number.", variant: 'destructive' });
            return;
        }
        if (!schoolDetails?.id) {
            toast({ title: 'School Details Missing', description: 'Could not resolve school identifier.', variant: 'destructive' });
            return;
        }
        const resolvedStorage = services?.storage || (app ? getStorage(app) : null);
        if (!resolvedStorage) {
            toast({ title: 'Storage Error', description: 'Firebase storage is not initialized.', variant: 'destructive' });
            return;
        }

        setIsSending(true);
        try {
            const billElement = document.getElementById('whatsapp-bill-preview');
            if (!billElement) throw new Error("Could not find bill preview element.");
            const wrapperElement = billElement.parentElement;
            if (!wrapperElement) throw new Error("Could not find bill wrapper element.");

            // CRITICAL FIX: html2canvas calculates text baselines incorrectly for elements that are opacity: 0
            // because the browser optimizes out their font metrics. We temporarily make it fully visible but
            // push it far off-screen so the user doesn't see it, forcing the browser to accurately render it.
            const originalOpacity = wrapperElement.style.opacity;
            const originalLeft = wrapperElement.style.left;
            const originalPosition = wrapperElement.style.position;
            const originalZIndex = wrapperElement.style.zIndex;

            wrapperElement.style.opacity = '1';
            wrapperElement.style.position = 'fixed';
            wrapperElement.style.left = '-9999px';
            wrapperElement.style.zIndex = '9999';

            await document.fonts.ready;

            let canvas;
            try {
                // Use html2canvas to capture the element exactly as it looks
                canvas = await html2canvas(billElement, {
                    scale: 2, // High resolution
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
            } finally {
                wrapperElement.style.opacity = originalOpacity;
                wrapperElement.style.left = originalLeft;
                wrapperElement.style.position = originalPosition;
                wrapperElement.style.zIndex = originalZIndex;
            }

            const imgData = canvas.toDataURL('image/png');
            
            // Calculate PDF dimensions based on A4 size
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Re-create PDF with exact dimensions so nothing gets cut off
            const customPdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            // Add image to PDF
            customPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // Convert PDF to Blob
            const pdfBlob = customPdf.output('blob');

            // Upload PDF Blob to Firebase Storage
            const downloadUrl = await uploadAdmissionBillPdf(resolvedStorage, schoolDetails.id, className, pdfBlob);

            // Use raw Firebase URL directly
            let finalUrl = downloadUrl;

            // Construct message
            const message = `Hello! Please find the admission bill for *${className}* at *${schoolDetails?.name || 'PANNS Education Center'}* here:\n\n${finalUrl}\n\nTotal Due: *GHS ${totalAmount.toFixed(2)}*`;
            
            // Clean phone number (keep digits only)
            let cleanPhone = parentWhatsApp.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '233' + cleanPhone.substring(1);
            }

            // Form WhatsApp Link
            if (method === 'whatsapp') {
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
                // Navigate directly to avoid popup blockers in async operations
                window.open(whatsappUrl, '_blank');
                toast({ title: 'Bill Prepared', description: 'Opened WhatsApp.' });
            } else if (method === 'sms') {
                // SMS via API
                const res = await fetch('/api/sms/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schoolId: schoolDetails.id,
                        message: message,
                        recipient: 'custom',
                        customPhone: cleanPhone
                    })
                });
                
                if (res.ok) {
                    toast({ title: 'SMS Sent', description: 'Admission bill sent successfully via SMS.' });
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'SMS API returned error');
                }
            }
        } catch (err: any) {
            console.error('Failed to generate and share PDF:', err);
            toast({ title: 'Error', description: err.message || 'Failed to send PDF.', variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    };

    // Calculate total
    const categoriesTotal = categories.reduce((sum, cat) => sum + cat.items.reduce((catSum, item) => catSum + Number(item.amount), 0), 0);
    const extraTotal = extraItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalAmount = categoriesTotal + extraTotal;

    const renderExtraIcon = (iconName: string) => {
        switch(iconName) {
            case 'Droplet': return <Droplet className="w-5 h-5 text-white" strokeWidth={1.5} />;
            case 'Book': return <Book className="w-5 h-5 text-white" strokeWidth={1.5} />;
            case 'ClipboardList': return <ClipboardList className="w-5 h-5 text-white" strokeWidth={1.5} />;
            default: return <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />;
        }
    }

    const renderCategoryIcon = (title: string) => {
        switch(title) {
            case 'ADMISSION': return <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />;
            case 'UNIFORMS': return <Shirt className="w-5 h-5 text-white" strokeWidth={1.5} />;
            case 'STATIONERY': return <PenTool className="w-5 h-5 text-white" strokeWidth={1.5} />;
            default: return <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />;
        }
    }

    const renderBillContent = (isDuplicate = false) => (
                <div id={isDuplicate ? undefined : "admission-bill-preview"} className={`admission-bill-page bg-white shadow-xl print:shadow-none print:border-none w-full mx-auto relative font-sans text-black p-8 print:p-0 max-w-[800px]`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-8">
                        {/* Logo and Name Left */}
                        <div className="flex items-center gap-4">
                            {schoolDetails?.logoUrl ? (
                                <img src={schoolDetails.logoUrl} alt="Logo" className="h-28 w-28 object-contain shrink-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }} />
                            ) : (
                                <div className="h-28 w-28 rounded-full border-2 border-[#092257] flex items-center justify-center shrink-0">
                                    <span className="text-4xl font-bold text-[#092257]">{schoolDetails?.name?.charAt(0) || 'P'}</span>
                                </div>
                            )}
                            {/* Divider Line between Logo and Text */}
                            <div className="h-[90px] w-[3px] bg-[#cba454] mx-6 shrink-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}></div>
                            
                            <div className="flex flex-col justify-center" style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif" }}>
                                <h1 className="text-[52px] font-bold text-[#092257] uppercase leading-none tracking-wider mb-2" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    PANNS
                                </h1>
                                <h2 className="text-[28px] font-bold text-[#092257] uppercase leading-none tracking-widest mb-1" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    EDUCATION
                                </h2>
                                <h2 className="text-[28px] font-bold text-[#092257] uppercase leading-none tracking-widest" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    CENTER
                                </h2>
                            </div>
                        </div>
                        
                        {/* Contact Box Right */}
                        <div className="flex flex-col items-start gap-3 text-[13px] font-semibold text-[#092257] shrink-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="bg-[#092257] rounded-full flex items-center justify-center shrink-0" style={{ width: 28, height: 28, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <Phone className="w-3.5 h-3.5 text-white fill-white" />
                                </div>
                                <span style={{ lineHeight: '28px' }}>0545 203 743 / 0546 826 334</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="bg-[#092257] rounded-full flex items-center justify-center shrink-0" style={{ width: 28, height: 28, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <MessageSquare className="w-3.5 h-3.5 text-white fill-white" />
                                </div>
                                <span style={{ lineHeight: '28px' }}>0545 203 743</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="bg-[#092257] rounded-full flex items-center justify-center shrink-0" style={{ width: 28, height: 28, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <Mail className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span style={{ lineHeight: '28px' }}>pannseducationcentre@gmail.com</span>
                            </div>
                        </div>
                    </div>

                    {/* Title Banner */}
                    <div className="relative flex justify-center mb-6">
                        <div className="bg-[#092257] text-white px-20 py-3 rounded-md z-10" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                            <h1 className="text-3xl font-black tracking-widest uppercase leading-none">ADMISSION BILL</h1>
                        </div>
                    </div>

                    {/* Class Name Banner */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-[#f0dfb8] rounded-full px-8 py-2" style={{ display: 'flex', alignItems: 'center', gap: 12, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                            <GraduationCap className="w-8 h-8 fill-[#092257] shrink-0" style={{ display: 'block' }} />
                            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#092257', lineHeight: '1.3', margin: 0 }}>
                                {className}
                            </h2>
                        </div>
                    </div>

                    {/* Bill Items List */}
                    <div className="space-y-6 mb-6">
                        {categories.map((cat) => (
                            <div key={cat.id} className="border border-[#e0e0e0] rounded-lg overflow-hidden">
                                {/* Category Header */}
                                <div style={{ background: '#092257', display: 'flex', alignItems: 'stretch', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <div style={{ width: 48, background: '#07194a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        {renderCategoryIcon(cat.title)}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 24, paddingTop: 8, paddingBottom: 8 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', color: 'white', margin: 0, lineHeight: '1.4' }}>{cat.title}</h3>
                                        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', color: 'white', lineHeight: '1.4' }}>AMOUNT (GHS)</span>
                                    </div>
                                </div>
                                
                                {/* Category Items */}
                                <div className="bg-white">
                                    {cat.items.map((item, idx) => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 50, paddingRight: 24, paddingTop: 10, paddingBottom: 10, borderBottom: idx !== cat.items.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b5563', flexShrink: 0 }}></div>
                                                <span style={{ fontSize: 15, fontWeight: 500, color: '#1f2937', lineHeight: '1.4' }}>{item.name}</span>
                                            </div>
                                            <span style={{ fontSize: 15, fontWeight: 500, color: '#1f2937', textAlign: 'right', lineHeight: '1.4', minWidth: 80 }}>{item.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Extra Items List (Toiletries etc) */}
                    <div className="space-y-3 mb-6">
                        {extraItems.map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #d6c7a1', borderRadius: 8, overflow: 'hidden', background: '#f9f5eb', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                <div style={{ background: '#092257', width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    {renderExtraIcon(item.icon)}
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#092257', lineHeight: '1.4' }}>{item.name}</span>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', width: 96, textAlign: 'right', lineHeight: '1.4' }}>{item.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total Row */}
                    <div className="flex justify-end mb-8">
                        <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 8, overflow: 'hidden', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                            <div style={{ background: '#092257', color: 'white', fontWeight: 700, fontSize: 20, paddingLeft: 32, paddingRight: 32, paddingTop: 10, paddingBottom: 10, display: 'flex', alignItems: 'center', lineHeight: '1.4', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                TOTAL
                            </div>
                            <div style={{ background: '#cba454', color: '#092257', fontWeight: 900, fontSize: 24, paddingLeft: 40, paddingRight: 40, paddingTop: 10, paddingBottom: 10, display: 'flex', alignItems: 'center', lineHeight: '1.4', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    {/* Info Boxes (Feeding / Remedy) */}
                    {((feedingText && feedingText.trim() !== '') || (remedyText && remedyText.trim() !== '')) && (
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                            {feedingText && feedingText.trim() !== '' && (
                                <div style={{ flex: 1, background: '#e8f1f8', border: '1px solid #b5d3ed', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 16, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #092257', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Utensils className="w-5 h-5 text-[#092257]" />
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#092257', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                        {feedingText}
                                    </div>
                                </div>
                            )}
                            {remedyText && remedyText.trim() !== '' && (
                                <div style={{ flex: 1, background: '#e8f1f8', border: '1px solid #b5d3ed', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 16, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #092257', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <BookOpen className="w-5 h-5 text-[#092257]" />
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#092257', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                        {remedyText}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Mode */}
                    <div style={{ background: '#092257', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                        <div style={{ width: 48, height: 40, border: '1px solid #b38b36', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                            <Wallet className="w-6 h-6 text-[#b38b36]" />
                        </div>
                        <div>
                            <div style={{ color: '#b38b36', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', lineHeight: '1.4', marginBottom: 2, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>PAYMENT MODE</div>
                            <div style={{ color: 'white', fontSize: 14, lineHeight: '1.4' }}>
                                {paymentModeText}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="italic text-[#092257] text-[13px] font-medium leading-relaxed mb-6 whitespace-pre-line">
                        {notesText}
                    </div>

                    {/* Footer Policy */}
                    <div className="flex items-center gap-3 print:break-inside-avoid">
                        <AlertCircle className="w-7 h-7 text-[#cba454]" strokeWidth={2.5} />
                        <span className="font-black text-[14px] text-[#092257] italic uppercase leading-tight">
                            {footerText}
                        </span>
                    </div>

                </div>
    );
    return (
        <div className="flex flex-col lg:flex-row h-full gap-6 p-4 md:p-6 overflow-hidden print:h-auto print:p-0 print:overflow-visible bg-gray-50 print:bg-white text-black">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body * { visibility: hidden; }
                    .print-wrapper, .print-wrapper * { visibility: visible !important; }
                    .print-wrapper { 
                        position: absolute !important; 
                        top: 0 !important; 
                        left: 0 !important; 
                        width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        display: block !important;
                    }
                }
            ` }} />

            {/* Left Side: Configuration Panel */}
            <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto print:hidden pr-2">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold">Admission Bill</h2>
                        <p className="text-sm text-gray-500">Customize bill details</p>
                    </div>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" /> Print Bill
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-center pb-2">
                        <CardTitle className="text-lg">Class Settings</CardTitle>
                        <Button onClick={handleSaveBill} disabled={!selectedClass || isSaving || isLoadingBill} size="sm" variant="outline" className="h-8 gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save to Class
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Select Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoadingClasses}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select a class"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {classList.map(cls => (
                                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {isLoadingBill && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading bill configuration...
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Bill Title (Override)</Label>
                            <Input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. KINDERGARTEN 1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Share Admission Bill</CardTitle>
                        <CardDescription>Send a PDF copy of this bill directly to a parent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Parent's Phone Number</Label>
                            <Input 
                                type="tel" 
                                placeholder="e.g. 0545203743" 
                                value={parentWhatsApp} 
                                onChange={e => setParentWhatsApp(e.target.value)} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={() => handleSend('whatsapp')} 
                                disabled={isSending || !parentWhatsApp.trim()} 
                                className="w-full gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> ...
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-4 h-4" /> WhatsApp
                                    </>
                                )}
                            </Button>
                            <Button 
                                onClick={() => handleSend('sms')} 
                                disabled={isSending || !parentWhatsApp.trim()} 
                                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> ...
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-4 h-4" /> SMS
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Fee Categories</CardTitle>
                        <CardDescription>Add, edit, or remove fee items</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {categories.map(cat => (
                            <div key={cat.id} className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="font-bold text-sm uppercase">{cat.title}</h3>
                                    <Button variant="outline" size="sm" onClick={() => addItem(cat.id)} className="h-7 text-xs gap-1">
                                        <Plus className="w-3 h-3" /> Add Item
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {cat.items.map(item => (
                                        <div key={item.id} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-1">
                                                <Input 
                                                    value={item.name} 
                                                    onChange={e => updateItem(cat.id, item.id, 'name', e.target.value)}
                                                    className="h-8 text-sm"
                                                    placeholder="Item name"
                                                />
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <Input 
                                                    type="number"
                                                    value={item.amount} 
                                                    onChange={e => updateItem(cat.id, item.id, 'amount', Number(e.target.value))}
                                                    className="h-8 text-sm"
                                                    placeholder="Amount"
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(cat.id, item.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {cat.items.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">No items in this category.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center pb-2">
                        <div>
                            <CardTitle className="text-lg">Extra Items</CardTitle>
                            <CardDescription>Toiletries, Report Booklet, etc.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={addExtraItem} className="h-7 text-xs gap-1">
                            <Plus className="w-3 h-3" /> Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {extraItems.map(item => (
                            <div key={item.id} className="flex gap-2 items-start">
                                <div className="flex-1 space-y-1">
                                    <Input 
                                        value={item.name} 
                                        onChange={e => updateExtraItem(item.id, 'name', e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="Item name"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <Input 
                                        type="number"
                                        value={item.amount} 
                                        onChange={e => updateExtraItem(item.id, 'amount', Number(e.target.value))}
                                        className="h-8 text-sm"
                                        placeholder="Amount"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeExtraItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {extraItems.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No extra items.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Extra Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Feeding Information (Line breaks allowed)</Label>
                            <textarea 
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                value={feedingText} 
                                onChange={e => setFeedingText(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Remedy Teaching Information (Line breaks allowed)</Label>
                            <textarea 
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                value={remedyText} 
                                onChange={e => setRemedyText(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Mode Information</Label>
                            <Input value={paymentModeText} onChange={e => setPaymentModeText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>General Notes (Line breaks allowed)</Label>
                            <textarea 
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                value={notesText} 
                                onChange={e => setNotesText(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Refund Policy Footer</Label>
                            <Input value={footerText} onChange={e => setFooterText(e.target.value)} />
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* Right Side: Print Preview */}
            <div className="lg:w-2/3 flex justify-center items-start overflow-y-auto print:w-full print:block">
                <div className="print-wrapper w-full">
                    <div className="w-full flex justify-center">
                        {renderBillContent()}
                    </div>
                    {/* Page 2 - Only visible when printing, forced to a new page */}
                    <div className="hidden print:flex w-full justify-center" style={{ pageBreakBefore: 'always' }}>
                        {renderBillContent(true)}
                    </div>
                </div>

                {/* Hidden Mobile-Friendly Bill for WhatsApp PDF Generation */}
                <div className="absolute left-0 top-0 w-full -z-50 opacity-0 pointer-events-none">
                    <div id="whatsapp-bill-preview" className="admission-bill-page bg-white w-full max-w-[550px] mx-auto relative text-black p-6" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                        {/* CSS Hack to globally shift all text up for html2canvas */}
                        <style>{`
                            #whatsapp-bill-preview h1, 
                            #whatsapp-bill-preview h2, 
                            #whatsapp-bill-preview h3, 
                            #whatsapp-bill-preview span {
                                position: relative;
                                top: -7px !important;
                            }
                        `}</style>
                        
                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-6">
                            {/* Logo and Name Left */}
                            <div className="flex items-center gap-3">
                                {schoolDetails?.logoUrl ? (
                                    <img src={`/api/proxy-image?url=${encodeURIComponent(schoolDetails.logoUrl)}`} alt="Logo" className="h-20 w-20 object-contain shrink-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }} />
                                ) : (
                                    <div className="h-20 w-20 rounded-full border-2 border-[#092257] flex items-center justify-center shrink-0">
                                        <span className="text-3xl font-bold text-[#092257]">{schoolDetails?.name?.charAt(0) || 'P'}</span>
                                    </div>
                                )}
                                {/* Divider Line between Logo and Text */}
                                <div className="h-[70px] w-[3px] bg-[#cba454] mx-3 shrink-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}></div>
                                
                                <div className="flex flex-col justify-center" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                                    <h1 className="text-[34px] font-bold text-[#092257] uppercase leading-none tracking-wider mb-1" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        PANNS
                                    </h1>
                                    <h2 className="text-[18px] font-bold text-[#092257] uppercase leading-none tracking-widest mb-0.5" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        EDUCATION
                                    </h2>
                                    <h2 className="text-[18px] font-bold text-[#092257] uppercase leading-none tracking-widest" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        CENTER
                                    </h2>
                                </div>
                            </div>
                            
                            {/* Contact Box Right */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, fontSize: 11, fontWeight: 600, color: '#092257', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ background: '#092257', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        <Phone className="w-3 h-3 text-white fill-white" />
                                    </div>
                                    <span style={{ lineHeight: '24px' }}>0545 203 743 / 0546 826 334</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ background: '#092257', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        <MessageSquare className="w-3 h-3 text-white fill-white" />
                                    </div>
                                    <span style={{ lineHeight: '24px' }}>0545 203 743</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ background: '#092257', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        <Mail className="w-3 h-3 text-white" />
                                    </div>
                                    <span style={{ lineHeight: '24px' }}>pannseducationcentre@gmail.com</span>
                                </div>
                            </div>
                        </div>

                        {/* Title Banner */}
                        <div className="relative flex justify-center mb-5">
                            <div className="bg-[#092257] text-white px-12 py-2 rounded-md z-10" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                <h1 className="text-2xl font-black tracking-widest uppercase leading-normal">ADMISSION BILL</h1>
                            </div>
                        </div>

                        {/* Class Name Banner */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                            <div style={{ background: '#f0dfb8', borderRadius: 9999, paddingLeft: 24, paddingRight: 24, paddingTop: 6, paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 8, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                <GraduationCap className="w-6 h-6 fill-[#092257] shrink-0" style={{ display: 'block' }} />
                                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#092257', lineHeight: 'normal', margin: 0 }}>
                                    {className}
                                </h2>
                            </div>
                        </div>

                        {/* Bill Items List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            {categories.map((cat) => (
                                <div key={cat.id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
                                    {/* Category Header — icon inline as first cell */}
                                    <div style={{ background: '#092257', display: 'flex', alignItems: 'stretch', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        <div style={{ width: 40, background: '#07194a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                            {renderCategoryIcon(cat.title)}
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 12, paddingRight: 16, paddingTop: 7, paddingBottom: 7 }}>
                                            <h3 style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', color: 'white', margin: 0, lineHeight: 'normal' }}>{cat.title}</h3>
                                            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', color: 'white', lineHeight: 'normal' }}>AMOUNT (GHS)</span>
                                        </div>
                                    </div>

                                    {/* Category Items */}
                                    <div style={{ background: 'white' }}>
                                        {cat.items.map((item, idx) => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 39, paddingRight: 16, paddingTop: 9, paddingBottom: 9, borderBottom: idx !== cat.items.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4b5563', flexShrink: 0 }}></div>
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', lineHeight: 'normal' }}>{item.name}</span>
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', textAlign: 'right', lineHeight: 'normal', minWidth: 70 }}>{item.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Extra Items List (Toiletries etc) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                            {extraItems.map((item) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #d6c7a1', borderRadius: 8, overflow: 'hidden', background: '#f9f5eb', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <div style={{ background: '#092257', width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        {renderExtraIcon(item.icon)}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: '#092257', lineHeight: 'normal' }}>{item.name}</span>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', width: 80, textAlign: 'right', lineHeight: 'normal' }}>{item.amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Row */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 8, overflow: 'hidden', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                                <div style={{ background: '#092257', color: 'white', fontWeight: 700, fontSize: 18, paddingLeft: 24, paddingRight: 24, paddingTop: 8, paddingBottom: 8, display: 'flex', alignItems: 'center', lineHeight: 'normal', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <span>TOTAL</span>
                                </div>
                                <div style={{ background: '#cba454', color: '#092257', fontWeight: 900, fontSize: 20, paddingLeft: 24, paddingRight: 24, paddingTop: 8, paddingBottom: 8, display: 'flex', alignItems: 'center', lineHeight: 'normal', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                    <span>{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Info Boxes (Feeding / Remedy) */}
                        {((feedingText && feedingText.trim() !== '') || (remedyText && remedyText.trim() !== '')) && (
                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                {feedingText && feedingText.trim() !== '' && (
                                    <div style={{ flex: 1, background: '#e8f1f8', border: '1px solid #b5d3ed', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 12, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #092257', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Utensils className="w-4 h-4 text-[#092257]" />
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#092257', lineHeight: 'normal', whiteSpace: 'pre-line' }}>
                                            <span>{feedingText}</span>
                                        </div>
                                    </div>
                                )}
                                {remedyText && remedyText.trim() !== '' && (
                                    <div style={{ flex: 1, background: '#e8f1f8', border: '1px solid #b5d3ed', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 12, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #092257', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BookOpen className="w-4 h-4 text-[#092257]" />
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#092257', lineHeight: 'normal', whiteSpace: 'pre-line' }}>
                                            <span>{remedyText}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payment Mode */}
                        <div style={{ background: '#092257', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                            <div style={{ width: 40, height: 32, border: '1px solid #b38b36', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                                <Wallet className="w-5 h-5 text-[#b38b36]" />
                            </div>
                            <div>
                                <div style={{ color: '#b38b36', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', lineHeight: 'normal', marginBottom: 2, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}><span>PAYMENT MODE</span></div>
                                <div style={{ color: 'white', fontSize: 12, lineHeight: 'normal' }}>
                                    <span>{paymentModeText}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div style={{ fontStyle: 'italic', color: '#092257', fontSize: 12, fontWeight: 500, lineHeight: '1.6', marginBottom: 20, whiteSpace: 'pre-line' }}>
                            <span>{notesText}</span>
                        </div>

                        {/* Footer Policy */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle style={{ width: 20, height: 20, color: '#cba454', flexShrink: 0 }} strokeWidth={2.5} />
                            <span style={{ fontWeight: 900, fontSize: 12, color: '#092257', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: '1.3' }}>
                                {footerText}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

