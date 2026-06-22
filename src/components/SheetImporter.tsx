import React, { useState, useCallback } from 'react';
import { 
  Clipboard, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  FileCheck
} from 'lucide-react';
import { extractCampaignsFromImage, ExtractedCampaign } from '../services/geminiService';
import { cn } from '../lib/utils';

interface SheetImporterProps {
  onCommit: (entries: ExtractedCampaign[]) => Promise<void>;
}

export const SheetImporter: React.FC<SheetImporterProps> = ({ onCommit }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedCampaign[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isGhosting, setIsGhosting] = useState(false);
  const [showForceBtn, setShowForceBtn] = useState(false);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (!blob) continue;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const data = await extractCampaignsFromImage(base64);
          setExtracted(data);
          setIsProcessing(false);
        };
        reader.readAsDataURL(blob);
      }
    }
  }, []);

  const handleCommit = async () => {
    // Validate required fields
    const invalidRows = extracted.filter(row => !row.offerName || !row.listDateRange || !row.dataType);
    if (invalidRows.length > 0) {
      alert(`VALIDATION ERROR: ${invalidRows.length} rows are missing required fields (Offer Name, List Date, or Type). Please fix highlighted fields.`);
      return;
    }

    setIsGhosting(true);
    const timer = setTimeout(() => setShowForceBtn(true), 3000);
    try {
      await onCommit(extracted);
      setExtracted([]);
      setIsDone(true);
      clearTimeout(timer);
      setShowForceBtn(false);
      setTimeout(() => {
        setIsDone(false);
        setIsGhosting(false);
      }, 2000);
    } catch (error) {
      console.error("Commit failed:", error);
      setIsGhosting(false);
      setShowForceBtn(true);
    }
  };

  const isFieldInvalid = (row: ExtractedCampaign, field: keyof ExtractedCampaign) => {
    if (field === 'offerName' && !row.offerName) return true;
    if (field === 'listDateRange' && !row.listDateRange) return true;
    if (field === 'dataType' && !row.dataType) return true;
    return false;
  };

  const handleForceCommit = async () => {
    if (confirm("FORCE COMMIT ALL RECORDS INTO VAULT?")) {
      await onCommit(extracted); // Direct call to bypass validation
      setExtracted([]);
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        setIsGhosting(false);
      }, 2000);
    }
  };

  const updateExtractedField = (index: number, field: keyof ExtractedCampaign, value: any) => {
    const newExtracted = [...extracted];
    newExtracted[index] = { ...newExtracted[index], [field]: value };
    setExtracted(newExtracted);
  };

  return (
    <div 
      onPaste={handlePaste}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-8 transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center text-center gap-4",
        isProcessing ? "border-blue-500 bg-blue-50/50" : "border-[#141414]/20 hover:border-blue-500 hover:bg-[#141414]/5",
        extracted.length > 0 && "border-solid border-[#141414]"
      )}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <h3 className="font-serif italic text-xl">Analyzing High-Speed Sheet Data...</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Initializing OCR Neural Engine</p>
        </div>
      ) : extracted.length > 0 ? (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-4 -m-8 mb-4 rounded-t-xl">
             <div className="flex items-center gap-2">
                <Clipboard size={18} />
                <h3 className="font-serif italic text-lg text-left">Audit Draft: Review Data Prior to Commitment</h3>
             </div>
             <button onClick={() => setExtracted([])} className="hover:text-red-400 transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="overflow-x-auto max-h-[400px] border border-[#141414]/10 rounded-lg shadow-inner">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead className="sticky top-0 bg-[#E4E3E0] border-b border-[#141414]/20 z-10">
                <tr>
                  <th className="p-2 border-r border-[#141414]/10">ID</th>
                  <th className="p-2 border-r border-[#141414]/10">Name*</th>
                  <th className="p-2 border-r border-[#141414]/10">List Date*</th>
                  <th className="p-2 border-r border-[#141414]/10">Type*</th>
                  <th className="p-2 border-r border-[#141414]/10">Source</th>
                  <th className="p-2 border-r border-[#141414]/10">Target</th>
                  <th className="p-2 border-r border-[#141414]/10">Rev</th>
                  <th className="p-2 border-r border-[#141414]/10">Date</th>
                  <th className="p-2">Cat</th>
                </tr>
              </thead>
              <tbody>
                {extracted.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#141414]/5 hover:bg-white/50">
                    <td className="p-2 border-r border-[#141414]/10">
                      <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.offerId}
                        onChange={(e) => updateExtractedField(idx, 'offerId', e.target.value)}
                      />
                    </td>
                    <td className={cn("p-2 border-r border-[#141414]/10", isFieldInvalid(row, 'offerName') && "bg-red-50 ring-1 ring-inset ring-red-300")}>
                      <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.offerName}
                        placeholder="REQUIRED"
                        onChange={(e) => updateExtractedField(idx, 'offerName', e.target.value)}
                      />
                    </td>
                    <td className={cn("p-2 border-r border-[#141414]/10", isFieldInvalid(row, 'listDateRange') && "bg-red-50 ring-1 ring-inset ring-red-300")}>
                      <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.listDateRange}
                        placeholder="REQUIRED"
                        onChange={(e) => updateExtractedField(idx, 'listDateRange', e.target.value)}
                      />
                    </td>
                    <td className={cn("p-2 border-r border-[#141414]/10", isFieldInvalid(row, 'dataType') && "bg-red-50 ring-1 ring-inset ring-red-300")}>
                      <select 
                        className="bg-transparent border-none outline-none w-full appearance-none"
                        value={row.dataType}
                        onChange={(e) => updateExtractedField(idx, 'dataType', e.target.value)}
                      >
                         <option value="">SELECT TYPE*</option>
                         <option value="Open">Open</option>
                         <option value="Click">Click</option>
                         <option value="Unsub">Unsub</option>
                         <option value="Sender Spam">Sender Spam</option>
                      </select>
                    </td>
                    <td className="p-2 border-r border-[#141414]/10">
                      <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.sourceData}
                        onChange={(e) => updateExtractedField(idx, 'sourceData', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border-r border-[#141414]/10">
                      <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.targetMix}
                        onChange={(e) => updateExtractedField(idx, 'targetMix', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border-r border-[#141414]/10">
                      <input 
                         type="number"
                        className="bg-transparent border-none outline-none w-full"
                        value={row.revenue}
                        onChange={(e) => updateExtractedField(idx, 'revenue', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 border-r border-[#141414]/10 font-mono text-[9px]">
                      <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.createdDate}
                        onChange={(e) => updateExtractedField(idx, 'createdDate', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                       <input 
                        className="bg-transparent border-none outline-none w-full"
                        value={row.category}
                        onChange={(e) => updateExtractedField(idx, 'category', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showForceBtn && isGhosting ? (
            <button
              onClick={handleForceCommit}
              className="w-full py-4 bg-orange-500 text-white border-2 border-orange-600 font-mono uppercase tracking-[0.2em] font-bold flex flex-col items-center justify-center gap-1 hover:bg-orange-600 transition-all shadow-md mt-2"
            >
              <AlertCircle size={20} />
              <span>Stuck? Force Commit All Records</span>
              <span className="text-[8px] opacity-80">(Bypasses Final Sync Check)</span>
            </button>
          ) : (
            <button
              onClick={handleCommit}
              disabled={isGhosting}
              className={cn(
                "w-full py-4 bg-[#00FF00]/20 text-[#006400] border-2 border-[#00FF00] font-mono uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 hover:bg-[#00FF00]/30 transition-all shadow-md active:translate-y-1",
                isGhosting && "bg-gray-200 border-gray-400 text-gray-500 cursor-not-allowed opacity-50"
              )}
            >
              {isGhosting ? (
                <>
                   <Loader2 size={18} className="animate-spin" />
                   Processing Ledger Sync...
                </>
              ) : (
                <>
                  <FileCheck size={20} />
                  Commit to Campaign Ledger
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-blue-500 text-white p-3 rounded-full mb-2">
            <Upload size={32} />
          </div>
          <h2 className="font-serif italic text-2xl">Sheet Import: Ctrl+V Screenshot</h2>
          <p className="max-w-[400px] text-xs font-mono uppercase tracking-widest opacity-60">
            Paste a screenshot of your Google Sheet or Excel performance data to bulk-import campaign history.
          </p>
          <div className="mt-4 flex gap-4 text-[10px] font-mono opacity-40 uppercase">
             <span>Auto-Header Mapping</span>
             <span>•</span>
             <span>De-duplication Active</span>
          </div>
        </>
      )}

      {isDone && (
        <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center animate-in zoom-in duration-300">
           <CheckCircle2 size={64} className="text-[#00FF00]" />
           <h3 className="font-serif italic text-2xl mt-4">Ledger Updated Successfully</h3>
           <p className="font-mono text-[10px] uppercase mt-2">Historical data merged into persistent vault</p>
        </div>
      )}
    </div>
  );
};
