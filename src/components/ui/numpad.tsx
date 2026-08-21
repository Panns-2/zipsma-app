'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumpadProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    allowDecimal?: boolean;
}

export function Numpad({ value, onChange, maxLength = 8, allowDecimal = true }: NumpadProps) {
    const handleNumberClick = (num: string) => {
        if (value.length >= maxLength) return;
        // Prevent multiple decimals
        if (num === '.' && value.includes('.')) return;
        // Prevent leading zeros unless followed by decimal
        if (value === '0' && num !== '.') {
            onChange(num);
            return;
        }
        onChange(value + num);
    };

    const handleDelete = () => {
        onChange(value.slice(0, -1));
    };

    const buttons = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        allowDecimal ? '.' : '', '0'
    ];

    return (
        <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] mx-auto">
            {buttons.map((btn, index) => (
                <div key={index} className="h-14 sm:h-16">
                    {btn !== '' && (
                        <Button
                            variant="outline"
                            className="w-full h-full text-2xl font-semibold rounded-2xl bg-white shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
                            onClick={() => handleNumberClick(btn)}
                            type="button"
                        >
                            {btn}
                        </Button>
                    )}
                </div>
            ))}
            <div className="h-14 sm:h-16">
                <Button
                    variant="outline"
                    className="w-full h-full rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 border-red-100 shadow-sm active:scale-95 transition-transform flex items-center justify-center"
                    onClick={handleDelete}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onChange('');
                    }} // Long press / right click to clear
                    type="button"
                >
                    <Delete className="w-8 h-8" />
                </Button>
            </div>
        </div>
    );
}
