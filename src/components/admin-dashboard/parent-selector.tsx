import React, { useState } from 'react';
import { Parent } from '@/lib/data-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ParentSelectorProps {
    parents: Parent[];
    selectedParentId: string;
    onSelectParent: (parentId: string) => void;
    onAddNewParent: (parentData: Partial<Parent>) => Promise<string>;
    onEditParent?: (parentId: string, parentData: Partial<Parent>) => Promise<void>;
    disabled?: boolean;
}

export function ParentSelector({ parents, selectedParentId, onSelectParent, onAddNewParent, onEditParent, disabled }: ParentSelectorProps) {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newParent, setNewParent] = useState<Partial<Parent>>({
        name: '', phone: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '', preferredVoiceLanguage: 'en-GH'
    });
    const [editParentData, setEditParentData] = useState<Partial<Parent>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveNewParent = async () => {
        if (!newParent.name || !newParent.phone) return;
        setIsSubmitting(true);
        try {
            const newId = await onAddNewParent(newParent);
            onSelectParent(newId);
            setIsAddingNew(false);
            setNewParent({ name: '', phone: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '', preferredVoiceLanguage: 'en-GH' });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveEditParent = async () => {
        if (!editParentData.name || !editParentData.phone || !onEditParent || !selectedParentId) return;
        setIsSubmitting(true);
        try {
            await onEditParent(selectedParentId, editParentData);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = () => {
        const p = parents.find(x => x.id === selectedParentId);
        if (p) {
            setEditParentData(p);
            setIsEditing(true);
        }
    };

    const selectedParent = parents.find(p => p.id === selectedParentId);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Parent / Guardian</Label>
                <div className="flex gap-2">
                    <Select value={selectedParentId} onValueChange={onSelectParent} disabled={disabled}>
                        <SelectTrigger className="flex-1 text-left">
                            {selectedParent ? (
                                <span className="truncate">{selectedParent.name}</span>
                            ) : (
                                <SelectValue placeholder="Select a parent..." />
                            )}
                        </SelectTrigger>
                        <SelectContent>
                            {parents.map(p => (
                                <SelectItem key={p.id} value={p.id as string}>
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="font-medium">{p.name}</span>
                                        <span className="text-xs text-muted-foreground">{p.phone}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedParentId && onEditParent ? (
                        <Button type="button" variant="outline" onClick={openEditModal} disabled={disabled}>
                            Edit
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" onClick={() => setIsAddingNew(true)} disabled={disabled}>
                            Add New
                        </Button>
                    )}
                </div>
                {selectedParent && (
                    <p className="text-xs text-muted-foreground px-1">
                        Phone: {selectedParent.phone}
                    </p>
                )}
            </div>

            <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Parent</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name *</Label><Input value={newParent.name} onChange={e => setNewParent({...newParent, name: e.target.value})} required disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={newParent.phone} onChange={e => setNewParent({...newParent, phone: e.target.value})} required disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={newParent.email} onChange={e => setNewParent({...newParent, email: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Address</Label><Textarea value={newParent.address} onChange={e => setNewParent({...newParent, address: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Emergency Contact Name</Label><Input value={newParent.emergencyContactName} onChange={e => setNewParent({...newParent, emergencyContactName: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Emergency Contact Phone</Label><Input type="tel" value={newParent.emergencyContactPhone} onChange={e => setNewParent({...newParent, emergencyContactPhone: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2">
                            <Label>Preferred Voice Language</Label>
                            <Select value={newParent.preferredVoiceLanguage} onValueChange={val => setNewParent({...newParent, preferredVoiceLanguage: val})} disabled={isSubmitting}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en-GH">English</SelectItem>
                                    <SelectItem value="tw">Twi</SelectItem>
                                    <SelectItem value="ha">Hausa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleSaveNewParent} disabled={isSubmitting || !newParent.name || !newParent.phone}>Save Parent</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Parent Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name *</Label><Input value={editParentData.name || ''} onChange={e => setEditParentData({...editParentData, name: e.target.value})} required disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={editParentData.phone || ''} onChange={e => setEditParentData({...editParentData, phone: e.target.value})} required disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={editParentData.email || ''} onChange={e => setEditParentData({...editParentData, email: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Address</Label><Textarea value={editParentData.address || ''} onChange={e => setEditParentData({...editParentData, address: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Emergency Contact Name</Label><Input value={editParentData.emergencyContactName || ''} onChange={e => setEditParentData({...editParentData, emergencyContactName: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2"><Label>Emergency Contact Phone</Label><Input type="tel" value={editParentData.emergencyContactPhone || ''} onChange={e => setEditParentData({...editParentData, emergencyContactPhone: e.target.value})} disabled={isSubmitting} /></div>
                        <div className="space-y-2">
                            <Label>Preferred Voice Language</Label>
                            <Select value={editParentData.preferredVoiceLanguage || 'en-GH'} onValueChange={val => setEditParentData({...editParentData, preferredVoiceLanguage: val})} disabled={isSubmitting}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en-GH">English</SelectItem>
                                    <SelectItem value="tw">Twi</SelectItem>
                                    <SelectItem value="ha">Hausa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleSaveEditParent} disabled={isSubmitting || !editParentData.name || !editParentData.phone}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
