import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  Search,
  ArrowUpDown,
  Plus,
  Trophy,
  Maximize2
} from 'lucide-react';
import { LedgerEntry } from '../hooks/useLedger';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

interface LedgerTableProps {
  entries: LedgerEntry[];
  onUpdate: (id: string, field: keyof LedgerEntry, value: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteMultiple: (ids: string[]) => Promise<void>;
  selectedRowId: string | null;
  onSelectRow: (id: string | null) => void;
}

type SortConfig = {
  key: keyof LedgerEntry | 'revK';
  direction: 'asc' | 'desc';
} | null;

type FilterType = 'ALL' | 'WINNER' | 'BAD';

export const LedgerTable: React.FC<LedgerTableProps> = ({ 
  entries, 
  onUpdate, 
  onDelete,
  onDeleteMultiple,
  selectedRowId,
  onSelectRow
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp_created', direction: 'desc' });
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('ALL');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const handleSort = (key: keyof LedgerEntry | 'revK') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const goldenLists = useMemo(() => {
    const listWins: { [key: string]: number } = {};
    entries.forEach(e => {
      if (e.revenue > 0) {
        listWins[e.targetMix] = (listWins[e.targetMix] || 0) + 1;
      }
    });
    return Object.keys(listWins).filter(list => listWins[list] >= 3);
  }, [entries]);

  const filteredAndSortedEntries = useMemo(() => {
    let result = entries.filter(entry => {
      const searchStr = `${entry.offerId} ${entry.offerName} ${entry.sourceData} ${entry.targetMix} ${entry.category}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      if (filter === 'WINNER') {
        return matchesSearch && entry.revenue > 0;
      }
      if (filter === 'BAD') {
        return matchesSearch && entry.revenue === 0;
      }
      return matchesSearch;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof LedgerEntry];
        let bValue: any = b[sortConfig.key as keyof LedgerEntry];

        if (sortConfig.key === 'revK') {
          aValue = a.length > 0 ? a.revenue / (a.length / 1000) : 0;
          bValue = b.length > 0 ? b.revenue / (b.length / 1000) : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [entries, searchTerm, sortConfig, filter]);

  const getRowStatusColor = (entry: LedgerEntry) => {
    if (entry.revenue > 0) return 'bg-[#00FF00]/10 border-l-4 border-l-[#00FF00] shadow-[inset_0_0_20px_rgba(0,255,0,0.15)]';
    if (entry.revenue === 0) return 'bg-[#FF4B4B]/10 border-l-4 border-l-[#FF4B4B] opacity-80';
    return '';
  };

  const HeaderCell = ({ label, sortKey, className }: { label: string, sortKey?: keyof LedgerEntry | 'revK', className?: string }) => (
    <th 
      className={cn(
        "p-1.5 border-r border-[#E4E3E0]/20 font-mono text-[8px] uppercase tracking-wider sticky top-0 bg-[#141414] text-[#E4E3E0] z-10",
        sortKey && "cursor-pointer hover:bg-neutral-800 transition-colors",
        className
      )}
      onClick={() => sortKey && handleSort(sortKey)}
    >
      <div className="flex items-center gap-1 justify-center">
        {label}
        {sortKey && <ArrowUpDown size={8} className="opacity-30" />}
      </div>
    </th>
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedEntries.map(e => e.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`CRITICAL: PURGE ${selectedIds.size} DATA POINTS FOREVER?`)) {
      try {
        const idsToDelete = Array.from(selectedIds);
        setSelectedIds(new Set()); // Optimistic UI clear
        await onDeleteMultiple(idsToDelete);
      } catch (err) {
        console.error("Bulk Purge Failed:", err);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadId) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await onUpdate(activeUploadId, 'creativeImage', base64);
      };
      reader.readAsDataURL(file);
    }
    setActiveUploadId(null);
  };

  const handleImageClick = (id: string) => {
    setActiveUploadId(id);
    fileInputRef.current?.click();
  };

  const handlePaste = async (e: React.ClipboardEvent, entryId: string) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            await onUpdate(entryId, 'creativeImage', base64);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  return (
    <div className="w-full space-y-2">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
      <div className="flex items-center gap-4 bg-white/80 p-1.5 rounded border border-[#141414]/20 backdrop-blur-sm sticky top-0 z-20">
        <Search size={14} className="opacity-40 ml-2" />
        <input 
          type="text" 
          placeholder="GLOBAL FILTER: SEARCH BY ID, NAME, SOURCE, OR CATEGORY..."
          className="bg-transparent border-none outline-none w-full font-mono text-[9px] uppercase tracking-widest p-0.5"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex items-center gap-1 border-l border-[#141414]/10 px-4">
           <button 
             onClick={() => setFilter('ALL')}
             className={cn(
               "text-[8px] font-mono uppercase px-2 py-1 border transition-all",
               filter === 'ALL' ? "bg-[#141414] text-white" : "border-[#141414]/20 hover:bg-neutral-100"
             )}
           >
             All
           </button>
           <button 
             onClick={() => setFilter('WINNER')}
             className={cn(
               "text-[8px] font-mono uppercase px-2 py-1 border transition-all",
               filter === 'WINNER' ? "bg-[#00FF00] text-black font-bold" : "border-[#141414]/20 hover:bg-[#00FF00]/10"
             )}
           >
             Winners
           </button>
           <button 
             onClick={() => setFilter('BAD')}
             className={cn(
               "text-[8px] font-mono uppercase px-2 py-1 border transition-all",
               filter === 'BAD' ? "bg-[#FF4B4B] text-white font-bold" : "border-[#141414]/20 hover:bg-[#FF4B4B]/10"
             )}
           >
             Bad
           </button>
        </div>

        <div className="flex items-center gap-2 border-l border-[#141414]/10 px-4">
           <button 
             onClick={() => handleSort('revenue')}
             className={cn(
               "text-[8px] font-mono uppercase px-2 py-1 border transition-all",
               sortConfig?.key === 'revenue' ? "bg-[#141414] text-white" : "border-[#141414]/20 hover:bg-neutral-100"
             )}
           >
             Sort by Revenue
           </button>
           <button 
             onClick={() => handleSort('timestamp_created')}
             className={cn(
               "text-[8px] font-mono uppercase px-2 py-1 border transition-all",
               sortConfig?.key === 'timestamp_created' ? "bg-[#141414] text-white" : "border-[#141414]/20 hover:bg-neutral-100"
             )}
           >
             Sort by Date
           </button>
        </div>

        {selectedIds.size > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-1 bg-red-600 text-white text-[8px] font-mono uppercase px-2 py-1 rounded shadow-lg animate-pulse"
          >
            <Trash2 size={10} />
            Purge {selectedIds.size} Selected
          </button>
        )}

        <div className="text-[8px] font-mono opacity-40 px-3 border-l border-[#141414]/10 whitespace-nowrap">
          {filteredAndSortedEntries.length} DATA POINTS SECURED
        </div>
      </div>

      <div className="w-full overflow-x-auto bg-[#F8F9FA] border border-[#141414] shadow-xl max-h-[700px] overflow-y-auto scrollbar-thin">
        <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="w-8 p-1 sticky top-0 bg-[#141414] text-[#E4E3E0] z-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.size === filteredAndSortedEntries.length && filteredAndSortedEntries.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3 h-3 cursor-pointer"
                    />
                  </th>
                  <th className="w-8 p-1 sticky top-0 bg-[#141414] text-[#E4E3E0] z-10 text-[7px] uppercase">IMG</th>
                  <HeaderCell label="Identity (Name/ID)" className="w-40" />
                  <HeaderCell label="List Name (Target)" sortKey="targetMix" className="w-28" />
                  <HeaderCell label="List Date (Range)" sortKey="listDateRange" className="w-24" />
                  <HeaderCell label="Source (From)" sortKey="sourceData" className="w-28" />
                  <HeaderCell label="Type" sortKey="dataType" className="w-14" />
                  <HeaderCell label="Rev ($)" sortKey="revenue" className="w-16" />
                  <HeaderCell label="Created" sortKey="timestamp_created" className="w-24" />
                  <HeaderCell label="Cat" sortKey="category" className="w-12" />
                  <HeaderCell label="Rev/K" sortKey="revK" className="w-12" />
                  <th className="p-1 sticky top-0 bg-[#141414] text-[#E4E3E0] font-mono text-[7px] uppercase z-10 w-10 text-center">ACT</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center opacity-40 font-serif italic text-sm">
                      No records match current parameters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedEntries.map((entry) => {
                    const revK = entry.length > 0 ? (entry.revenue / (entry.length / 1000)).toFixed(2) : '0.00';
                    const isSelected = selectedRowId === entry.id;
                    const isChecked = selectedIds.has(entry.id);
                    const isGolden = goldenLists.includes(entry.targetMix);
                    
                    // Format full time for created column
                    const createdTime = entry.timestamp_created || 'N/A';
                    
                    return (
                      <tr 
                        key={entry.id} 
                        onClick={() => onSelectRow(entry.id)}
                        className={cn(
                          "border-b border-[#141414]/5 group transition-all cursor-pointer relative h-8", 
                          getRowStatusColor(entry),
                          isSelected && "ring-1 ring-inset ring-blue-500 bg-blue-50/30",
                          isChecked && "bg-blue-100/50"
                        )}
                      >
                        <td className="p-0.5 border-r border-[#141414]/5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleSelectOne(entry.id)}
                            className="w-3 h-3 cursor-pointer"
                          />
                        </td>
                        <td 
                          className="p-0.5 border-r border-[#141414]/5 text-center focus:outline-none focus:bg-blue-50/50"
                          onPaste={(e) => handlePaste(e, entry.id)}
                          onClick={(e) => { e.stopPropagation(); handleImageClick(entry.id); }}
                          tabIndex={0}
                        >
                          <div className="w-6 h-6 bg-neutral-200 rounded-sm flex items-center justify-center overflow-hidden border border-neutral-300 relative group/img mx-auto">
                            {entry.creativeImage ? (
                              <>
                                <img src={entry.creativeImage} className="w-full h-full object-contain" />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedImage(entry.creativeImage!); }}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <Maximize2 size={8} className="text-white" />
                                </button>
                              </>
                            ) : (
                              <Plus size={8} className="opacity-20" />
                            )}
                          </div>
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5">
                          <div className="flex flex-col justify-center h-full">
                            <input 
                              className="bg-transparent border-none outline-none w-full font-serif italic text-[10px] font-bold truncate leading-none focus:bg-white p-0.5 rounded"
                              defaultValue={entry.offerName}
                              onBlur={(e) => onUpdate(entry.id, 'offerName', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            />
                            <input 
                              className="bg-transparent border-none outline-none w-full font-mono text-[7px] opacity-40 uppercase tracking-tighter leading-none focus:bg-white p-0.5 rounded"
                              defaultValue={entry.offerId}
                              onBlur={(e) => onUpdate(entry.id, 'offerId', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            />
                          </div>
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5 font-mono text-[8.5px] truncate relative pr-5">
                          <input 
                            className="bg-transparent border-none outline-none w-full font-mono text-[8.5px] truncate focus:bg-white p-0.5 rounded"
                            defaultValue={entry.targetMix}
                            onBlur={(e) => onUpdate(entry.id, 'targetMix', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                          {isGolden && (
                            <Trophy size={8} className="text-yellow-600 absolute right-0.5 top-1 animate-bounce" />
                          )}
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5">
                          <input 
                            className="bg-transparent border-none outline-none w-full font-mono text-[8.5px] truncate focus:bg-white p-0.5 rounded"
                            defaultValue={entry.listDateRange}
                            onBlur={(e) => onUpdate(entry.id, 'listDateRange', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5">
                          <input 
                            className="bg-transparent border-none outline-none w-full font-mono text-[8.5px] truncate focus:bg-white p-0.5 rounded"
                            defaultValue={entry.sourceData}
                            onBlur={(e) => onUpdate(entry.id, 'sourceData', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5">
                           <select 
                            className="bg-transparent border-none outline-none w-full font-mono text-[8.5px] uppercase focus:bg-white p-0.5 rounded appearance-none"
                            value={entry.dataType}
                            onChange={(e) => onUpdate(entry.id, 'dataType', e.target.value)}
                          >
                            <option value="Open">Open</option>
                            <option value="Click">Click</option>
                            <option value="Unsub">Unsub</option>
                            <option value="Sender Spam">Sender Spam</option>
                          </select>
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5">
                          <div className="flex items-center h-full">
                            <span className="opacity-30 text-[8px] mr-0.5">$</span>
                            <input 
                              type="number"
                              step="0.01"
                              className="bg-transparent border-none outline-none w-full font-mono text-[9px] font-black text-[#141414] focus:bg-white p-0.5 rounded"
                              defaultValue={entry.revenue}
                              onBlur={(e) => onUpdate(entry.id, 'revenue', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            />
                          </div>
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5 font-mono text-[7px] opacity-60 text-center">
                          {createdTime}
                        </td>
                        <td className="p-0.5 px-1.5 border-r border-[#141414]/5">
                           <input 
                            className="bg-transparent border-none outline-none w-full font-mono text-[8px] uppercase tracking-tighter focus:bg-white p-0.5 rounded"
                            defaultValue={entry.category}
                            onBlur={(e) => onUpdate(entry.id, 'category', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                        </td>
                        <td className={cn(
                          "p-0.5 px-1.5 border-r border-[#141414]/5 font-mono text-[9px] font-black text-center",
                          parseFloat(revK) > 0.3 ? "text-green-600" : "text-neutral-400"
                        )}>
                          {revK}
                        </td>
                        <td className="p-0.5 px-1.5 text-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); confirm("PURGE DATA?") && onDelete(entry.id).catch(() => {}); }}
                            className="text-[#FF4B4B] opacity-20 hover:opacity-100 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded focus:opacity-100"
                            title="Purge Row"
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
        </table>
      </div>

      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-12 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <img src={expandedImage} className="max-w-full max-h-full object-contain shadow-2xl border-2 border-white/20 animate-in zoom-in duration-200" />
        </div>
      )}
    </div>
  );
};
