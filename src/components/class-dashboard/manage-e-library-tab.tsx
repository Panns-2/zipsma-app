'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookCopy, Link as LinkIcon, Loader2, PlusCircle, Trash2, Video, FileText } from 'lucide-react';
import { LibraryResource, getLibraryResourcesForClass, addLibraryResource, deleteLibraryResource } from '@/lib/data-store';
import { format } from 'date-fns';

interface ManageELibraryTabProps {
    schoolId: string | null;
    className: string;
}

export function ManageELibraryTab({ schoolId, className }: ManageELibraryTabProps) {
    const { db, auth } = useFirebase();
    const { toast } = useToast();
    
    const [resources, setResources] = useState<LibraryResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'pdf' | 'document' | 'video' | 'link'>('document');
    const [fileUrl, setFileUrl] = useState('');
    
    const fetchResources = async () => {
        if (!db || !schoolId || !className) return;
        setIsLoading(true);
        try {
            const data = await getLibraryResourcesForClass(db, schoolId, className);
            setResources(data);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to load library resources', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [db, schoolId, className]);

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !auth || !schoolId) return;
        if (!title || !fileUrl) {
            toast({ title: 'Error', description: 'Title and URL are required', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addLibraryResource(db, auth, schoolId, {
                title,
                description,
                type,
                fileUrl,
                className
            });
            toast({ title: 'Success', description: 'Library resource added successfully' });
            // Reset form
            setTitle('');
            setDescription('');
            setType('document');
            setFileUrl('');
            fetchResources();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to add resource', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!db || !auth) return;
        if (!confirm('Are you sure you want to delete this resource?')) return;
        
        try {
            await deleteLibraryResource(db, auth, id);
            toast({ title: 'Deleted', description: 'Resource has been removed' });
            fetchResources();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to delete resource', variant: 'destructive' });
        }
    };

    const getIconForType = (resType: string) => {
        switch (resType) {
            case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
            case 'video': return <Video className="w-4 h-4 text-blue-500" />;
            case 'link': return <LinkIcon className="w-4 h-4 text-purple-500" />;
            default: return <BookCopy className="w-4 h-4 text-green-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-primary" />
                        Add New Resource
                    </CardTitle>
                    <CardDescription>Share study materials, links, or videos with the class.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddResource} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Science Revision Notes" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Resource Type</Label>
                                <Select value={type} onValueChange={(v: any) => setType(v)}>
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="document">Document / Notes</SelectItem>
                                        <SelectItem value="pdf">PDF File</SelectItem>
                                        <SelectItem value="video">Video Link</SelectItem>
                                        <SelectItem value="link">External Link</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">Resource Link (URL)</Label>
                            <Input id="url" type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description (Optional)</Label>
                            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the material..." rows={2} />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Share with Class
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <BookCopy className="w-5 h-5 text-primary" />
                        Class E-Library
                    </CardTitle>
                    <CardDescription>Manage materials currently shared with {decodeURIComponent(className)}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : resources.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl">
                            <BookCopy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-bold text-gray-700">Library is empty</h3>
                            <p className="text-muted-foreground">Add resources above to populate the E-Library.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date Added</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {resources.map(resource => (
                                        <TableRow key={resource.id}>
                                            <TableCell>
                                                <div className="font-medium text-primary hover:underline cursor-pointer" onClick={() => window.open(resource.fileUrl, '_blank')}>
                                                    {resource.title}
                                                </div>
                                                {resource.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{resource.description}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getIconForType(resource.type)}
                                                    <span className="capitalize text-xs">{resource.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(resource.dateAdded, 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(resource.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
