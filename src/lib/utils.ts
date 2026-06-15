export const cleanTitle = (name: string): string => {
  if (!name) return '';
  let cleaned = name
    .replace(/\s*\((نێرس|پزیشکی بەنج|تەکنیکاری بەنج|تەکنیکار|کارمەندی بەنج|بەنج)\)/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
  
  if (/[a-zA-Z]/.test(cleaned)) {
    cleaned = cleaned.toLowerCase().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  return cleaned;
};

export const formatMoneyWithCommas = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = val.toString().replace(/,/g, '');
  if (!/^\d+$/.test(clean)) return clean;
  return Number(clean).toLocaleString('en-US');
};

export const parseMoneyWithCommas = (val: string): string => {
  return val.replace(/,/g, '');
};
