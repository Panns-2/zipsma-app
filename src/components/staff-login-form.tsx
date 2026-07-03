'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/client-provider';

export default function StaffLoginForm() {
  const router = useRouter();
  const { auth, db } = useFirebase();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Information Required',
        description: 'Please enter both your email address and password.',
        variant: 'destructive',
      });
      return;
    }
    if (!auth || !db) {
      toast({
        title: 'Error',
        description: 'Firebase Authentication is not initialized.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      if (user) {
        // Fetch the staff member document using their Auth UID
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffSnap = await getDoc(staffDocRef);

        if (staffSnap.exists()) {
          const staffData = staffSnap.data();
          if (staffData.isArchived) {
            throw new Error('This staff account has been archived. Please contact your administrator.');
          }

          // Populate session storage for backward compatibility with secondary pages
          sessionStorage.setItem('staffId', user.uid);
          sessionStorage.setItem('schoolId', staffData.schoolId);
          if (staffData.className) {
            sessionStorage.setItem('staffClassName', staffData.className);
          }

          toast({
            title: 'Login Successful',
            description: `Welcome back, ${staffData.name}!`,
          });
          
          router.push('/staff/dashboard');
        } else {
          // If no staff document exists under their uid, sign them out
          await auth.signOut();
          throw new Error('No staff profile associated with this account.');
        }
      }
    } catch (error: any) {
      console.error('Staff Login Error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="staff@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="pr-10"
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)} 
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all h-11 text-sm font-semibold" disabled={isLoading}>
        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : 'LOGIN'}
      </Button>
    </form>
  );
}
