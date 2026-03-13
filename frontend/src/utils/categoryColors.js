/**
 * Centralized color mapping for financial categories.
 * Ensures consistent visualization across different pages and timeframes.
 */
export const getCategoryColor = (cat) => {
  if (!cat || typeof cat !== 'string') return '#94a3b8';

  const colors = {
    // Income Categories
    'Salary / Major Transfer': '#10b981', // Emerald
    'Refund': '#f59e0b',                 // Amber
    'Income - Salary / Major Transfer': '#10b981',
    'Income - Peer-to-Peer (P2P)': '#6366f1',
    'Income - Refund': '#f59e0b',
    'Income - Other': '#94a3b8',
    
    // Expense Categories
    'Food & Dining': '#f97316',           // Orange
    'Groceries & Supermarkets': '#fbbf24', // Amber/Yellow
    'Fuel & Auto': '#ef4444',             // Red
    'Health & Pharmacy': '#f43f5e',       // Rose
    'Transport / Cab': '#34d399',         // Emerald Light
    'Entertainment': '#a855f7',           // Purple
    'Financial / Credit Card / Loan': '#0ea5e9', // Sky
    'Financial / Credit Card': '#0ea5e9',        // Sky
    'Shopping / E-commerce': '#ec4899',   // Pink
    'Utilities & Telecom': '#06b6d4',     // Cyan
    'Peer-to-Peer (P2P)': '#6366f1',      // Indigo
    'Expense - Peer-to-Peer (P2P)': '#6366f1',
    'Expense - Food & Dining': '#f97316',
    'Expense - Groceries & Supermarkets': '#fbbf24',
    'Expense - Fuel & Auto': '#ef4444',
    'Expense - Health & Pharmacy': '#f43f5e',
    'Expense - Transport / Cab': '#34d399',
    'Expense - Entertainment': '#a855f7',
    'Expense - Financial / Credit Card / Loan': '#0ea5e9',
    'Expense - Shopping / E-commerce': '#ec4899',
    'Expense - Utilities & Telecom': '#06b6d4',
    'Expense - Uncategorized': '#64748b',
    
    // Shared / Fallbacks
    'Uncategorized': '#64748b',           // Slate
    'General': '#64748b',                 // Slate
    'Other': '#94a3b8'                    // Gray
  };

  // 1. Try exact match first
  if (colors[cat]) return colors[cat];

  // 2. Normalize and check for exact match
  const normalizedCat = cat.replace('Expense - ', '').replace('Income - ', '');
  if (colors[normalizedCat]) return colors[normalizedCat];

  // 3. Check first part of "Category - Sub" or "Category / Sub"
  const firstPart = normalizedCat.split(/ - | \/ /)[0];
  if (colors[firstPart]) return colors[firstPart];

  // 4. Fuzzy match
  const catLower = normalizedCat.toLowerCase();
  const fuzzyMatch = Object.keys(colors).find(key => {
    const keyLower = key.toLowerCase();
    return catLower.includes(keyLower) || keyLower.includes(catLower);
  });
  
  if (fuzzyMatch) return colors[fuzzyMatch];

  return '#94a3b8'; // Default Slate Gray
};

export const COLORS_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
  '#06b6d4', '#ef4444', '#3b82f6', '#f43f5e', '#64748b'
];
