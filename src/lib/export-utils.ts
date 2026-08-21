export function exportToCSV(filename: string, rows: object[]) {
    if (!rows || !rows.length) {
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    
    const csvContent = [
        keys.join(separator),
        ...rows.map(row => 
            keys.map(k => {
                let cell = row[k as keyof typeof row] === null || row[k as keyof typeof row] === undefined 
                    ? '' 
                    : row[k as keyof typeof row];
                let cellStr = (cell as any) instanceof Date ? (cell as any).toLocaleString() : String(cell).replace(/"/g, '""');
                if (cellStr.search(/("|,|\n)/g) >= 0) {
                    cellStr = `"${cellStr}"`;
                }
                return cellStr;
            }).join(separator)
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
