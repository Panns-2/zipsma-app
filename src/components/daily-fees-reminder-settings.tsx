'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Calendar, CheckCircle2, XCircle, Play, Info, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const defaultMessage = `Dear Parent, this is a friendly reminder that {name}'s outstanding daily fee balance is {balance}. Please make a payment to avoid any inconvenience. Thank you`;

export function DailyFeesReminderSettings({ schoolId }: { schoolId: string }) {
    const { db } = useFirebase();
    const { toast } = useToast();
    
    const [isEnabled, setIsEnabled] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>(['monday']);
    const [time, setTime] = useState('09:00');
    const [customMessage, setCustomMessage] = useState(defaultMessage);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [showConfirmRealSms, setShowConfirmRealSms] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!db) return;

            setIsLoading(true);
            const settingsRef = doc(db, 'schools', schoolId.toUpperCase(), 'settings', 'dailyFeeReminders');

            try {
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    setIsEnabled(settings.isEnabled || false);
                    if (settings.selectedDays) {
                        setSelectedDays(settings.selectedDays);
                    } else if (settings.frequency === 'daily') {
                        setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
                    } else if (settings.day) {
                        setSelectedDays([settings.day]);
                    } else {
                        setSelectedDays(['monday']);
                    }
                    setTime(settings.time || '09:00');
                    setCustomMessage(settings.message || defaultMessage);
                }
            } catch (error) {
                console.error("Error fetching settings: ", error);
                toast({ title: 'Error', description: 'Could not load reminder settings.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        const fetchLogs = async () => {
            if (!db) return;
            try {
                const logsRef = collection(db, 'cron_logs');
                const q = query(
                    logsRef, 
                    where('schoolId', 'in', [schoolId, schoolId.toUpperCase(), schoolId.toLowerCase(), 'global']),
                    where('type', '==', 'daily_fees'),
                    orderBy('timestamp', 'desc'), 
                    limit(10)
                );
                const querySnapshot = await getDocs(q);
                const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecentLogs(logs);
            } catch (error) {
                console.error("Error fetching logs: ", error);
            }
        };

        fetchSettings();
        fetchLogs();

    }, [db, toast, schoolId]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) {
            toast({ title: 'Error', description: 'Database connection not ready.', variant: 'destructive' });
            return;
        }
        
        setIsSubmitting(true);
        const settingsRef = doc(db, 'schools', schoolId.toUpperCase(), 'settings', 'dailyFeeReminders');
        try {
            const settingsToSave = {
                isEnabled,
                selectedDays,
                time,
                message: customMessage,
            };
            await setDoc(settingsRef, settingsToSave, { merge: true });
            toast({
                title: 'Settings Saved',
                description: 'Your daily fees reminder settings have been updated successfully.',
            });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({ title: 'Error', description: 'Could not save reminder settings.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTriggerTest = async (dryRun: boolean = true) => {
        setIsTesting(true);
        try {
            const secret = 'CRON_SECRET';
            
            const response = await fetch(`/api/cron?test=true&dryRun=${dryRun}&schoolId=${schoolId}&type=daily_fees`, {
                method: 'GET',
                headers: {
                    'x-cron-secret': secret
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                toast({
                    title: dryRun ? "Test Simulation Complete" : "Test Reminders Sent",
                    description: result.message || "The process completed successfully. Check the logs below.",
                });
                // Refresh logs
                const logsRef = collection(db!, 'cron_logs');
                const q = query(
                    logsRef, 
                    where('schoolId', 'in', [schoolId, schoolId.toUpperCase(), schoolId.toLowerCase(), 'global']),
                    where('type', '==', 'daily_fees'),
                    orderBy('timestamp', 'desc'), 
                    limit(10)
                );
                const querySnapshot = await getDocs(q);
                setRecentLogs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
                toast({
                    title: "Test Failed",
                    description: result.error || "Unauthorized or API error. Check server logs.",
                    variant: "destructive"
                });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to trigger test.', variant: 'destructive' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-heading-lg">Daily Fees Reminder Settings</CardTitle>
                    <CardDescription>Configure automated SMS reminders for parents about outstanding daily fee balances (e.g., feeding, transport).</CardDescription>
                </CardHeader>
                {isLoading ? (
                     <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="daily-reminder-enabled" className="text-base">Enable Daily Fee Reminders</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Turn on or off the automated daily fee reminder system.
                                    </p>
                                </div>
                                <Switch
                                    id="daily-reminder-enabled"
                                    checked={isEnabled}
                                    onCheckedChange={setIsEnabled}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {isEnabled && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="space-y-3">
                                        <Label className="text-base">Days to Send Reminders</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 border rounded-lg bg-background">
                                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                                <div key={day} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`daily-day-${day}`} 
                                                        checked={selectedDays.includes(day)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedDays([...selectedDays, day]);
                                                            } else {
                                                                setSelectedDays(selectedDays.filter(d => d !== day));
                                                            }
                                                        }}
                                                    />
                                                    <Label 
                                                        htmlFor={`daily-day-${day}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                                    >
                                                        {day.substring(0, 3)}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="daily-reminder-time">Time of Day (24-hour)</Label>
                                            <Input 
                                                id="daily-reminder-time"
                                                type="time"
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                className="w-full"
                                                disabled={isSubmitting}
                                            />
                                            <p className="text-[10px] text-muted-foreground italic">
                                                Tip: You can change this time as often as needed.
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="daily-custom-message">Custom Message Template</Label>
                                        <Textarea
                                            id="daily-custom-message"
                                            placeholder="Enter your custom message here"
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            rows={4}
                                            disabled={isSubmitting}
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Use <code className="bg-slate-100 px-1 rounded">{`{name}`}</code> for student name and <code className="bg-slate-100 px-1 rounded">{`{balance}`}</code> for the outstanding daily fee balance.
                                        </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="flex-1"
                                            onClick={() => handleTriggerTest(true)}
                                            disabled={isTesting || isSubmitting}
                                        >
                                            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                            Simulate Test (Dry Run)
                                        </Button>
                                        
                                        <AlertDialog open={showConfirmRealSms} onOpenChange={setShowConfirmRealSms}>
                                            <Button 
                                                type="button" 
                                                variant="secondary" 
                                                className="flex-1"
                                                onClick={() => setShowConfirmRealSms(true)}
                                                disabled={isTesting || isSubmitting}
                                            >
                                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                                                Send Real Test SMS
                                            </Button>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Send Real SMS Reminders?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will send ACTUAL SMS messages to all parents with outstanding daily fee balances. This action will incur costs on your Hubtel account.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => {
                                                        console.log("Real SMS confirmation accepted");
                                                        handleTriggerTest(false);
                                                    }}>
                                                        Proceed & Send
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <div className="px-6 pb-6">
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    'Save Reminder Settings'
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>

            {isEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-heading-sm flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Recent Execution Logs
                        </CardTitle>
                        <CardDescription>
                            Review the history of automated daily fee reminder attempts for this school.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                    No execution logs found yet.
                                </div>
                            ) : (
                                recentLogs.map((log) => {
                                    const schoolLog = log.schoolLogs?.find((s: any) => s.schoolId === schoolId.toUpperCase());
                                    if (!schoolLog && !log.manual) return null;
                                    
                                    const date = new Date(log.timestamp).toLocaleString();
                                    const isError = log.errors && log.errors.length > 0;
                                    const status = schoolLog ? (schoolLog.failed > 0 ? 'Partial Success' : 'Success') : 'Global Run';

                                    return (
                                        <div key={log.id} className="p-4 border rounded-lg hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{date}</span>
                                                    {log.dryRun && <Badge variant="secondary">Dry Run</Badge>}
                                                    {log.manual && <Badge variant="outline">Manual</Badge>}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {schoolLog?.failed > 0 || isError ? (
                                                        <XCircle className="h-4 w-4 text-destructive" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                                    )}
                                                    <span className={`text-xs font-semibold ${schoolLog?.failed > 0 || isError ? 'text-destructive' : 'text-success'}`}>
                                                        {status}
                                                    </span>
                                                    {schoolLog?.dryRun && (
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1 text-muted-foreground">
                                                            Dry Run
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {schoolLog && (
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="bg-muted p-2 rounded">
                                                        <p className="text-muted-foreground">Attempted</p>
                                                        <p className="font-bold text-base">{schoolLog?.attempted || 0}</p>
                                                    </div>
                                                    <div className="bg-success/10 p-2 rounded">
                                                        <p className="text-success-foreground">Sent</p>
                                                        <p className="font-bold text-base text-success">{schoolLog?.sent || 0}</p>
                                                    </div>
                                                    <div className="bg-destructive/10 p-2 rounded">
                                                        <p className="text-destructive-foreground">Failed</p>
                                                        <p className="font-bold text-base text-destructive">{schoolLog?.failed || 0}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {schoolLog?.details?.length > 0 && (
                                                <div className="mt-2 pt-2 border-t text-[10px] text-destructive italic">
                                                    Errors: {schoolLog.details.map((d: any) => `${d.phone}: ${d.error}`).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }).filter(Boolean)
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
