import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Trash2, 
  Download, 
  Zap, 
  AlertTriangle,
  Search,
  X,
  FileSpreadsheet,
  Grid
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'react-hot-toast';

type ThreatTier = 1 | 2 | 3 | 4;

interface IPAuditResult {
  ip: string;
  status: 'Clean' | 'Compromised';
  tier: ThreatTier;
  tierLabel: string;
  blacklists: string[];
  yahooDanger: string;
  directive: string;
  subnetBurned?: boolean;
}

export const IPOracleMatrix: React.FC = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<IPAuditResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const auditInfrastructure = async () => {
    const rawIps = input.split('\n').map(ip => ip.trim()).filter(ip => ip.length > 0);
    if (rawIps.length === 0) {
      toast.error("No IP addresses found in input.");
      return;
    }

    setIsScanning(true);
    setProgress(0);
    setResults([]);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const batchSize = 10;
    const allResults: IPAuditResult[] = [];

    const toastId = toast.loading(`Initiating IP Oracle Mass Audit...`);

    try {
      for (let i = 0; i < rawIps.length; i += batchSize) {
        const batch = rawIps.slice(i, i + batchSize);
        const prompt = `You are the Lead Network Security Engineer. Perform a forensic reputation audit on these IPs: ${batch.join(', ')}.
        Categorize each IP into one of 4 Tiers based on the following strict rules:
        - Tier 1: THE KILL SWITCH (EXtreme Critical) -> Triggered by Spamhaus ZEN, Spamcop, Barracuda, Abusix, PSBL, MSRBL Phishing. Action: ❌ FATAL: STOP IMMEDIATELY. BURN AND REPLACE IP.
        - Tier 2: HIGH DANGER (High) -> Triggered by UCEPROTECT, Sender Score, MSRBL Spam, RATS Spam, SPFBL. Action: ⚠️ DANGER: HALT AUTOMATION. ROTATE IP.
        - Tier 3: WARNING ZONE (Medium) -> Triggered by Hostkarma, MAILSPIKE, SEM, IBM DNS, BLOCKLIST.DE, etc. Action: ⚠️ CAUTION: WARM SLOWLY. MONITOR BEHAVIOR.
        - Tier 4: THE NOISE (Low) -> Triggered by RATS Dyna/NoPtr, CYMRU, DAN TOR, etc. Action: 🟢 SAFE: MINOR FLAG ONLY. PROCEED WITH SENDING.

        Return STRICT JSON array:
        {
          "batch": [
            {
              "ip": "string",
              "status": "Clean|Compromised",
              "tier": 1|2|3|4,
              "tierLabel": "string (e.g. Extreme / Critical)",
              "blacklists": ["string"],
              "yahooDanger": "string (e.g. Mail Trust Damaged)",
              "directive": "string (The strict action command)"
            }
          ]
        }`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                batch: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ip: { type: Type.STRING },
                      status: { type: Type.STRING },
                      tier: { type: Type.NUMBER },
                      tierLabel: { type: Type.STRING },
                      blacklists: { type: Type.ARRAY, items: { type: Type.STRING } },
                      yahooDanger: { type: Type.STRING },
                      directive: { type: Type.STRING }
                    },
                    required: ["ip", "status", "tier", "tierLabel", "blacklists", "yahooDanger", "directive"]
                  }
                }
              }
            }
          }
        });

        if (response.text) {
          const data = JSON.parse(response.text);
          allResults.push(...data.batch);
          setProgress(Math.round(((i + batch.length) / rawIps.length) * 100));
        }
      }

      // Subnet Contamination Check (/24)
      const subnetMap: { [key: string]: number } = {};
      allResults.forEach(res => {
        const parts = res.ip.split('.');
        if (parts.length === 4) {
          const subnet = parts.slice(0, 3).join('.');
          if (res.tier <= 2) {
            subnetMap[subnet] = (subnetMap[subnet] || 0) + 1;
          }
        }
      });

      const processedResults = allResults.map(res => {
        const parts = res.ip.split('.');
        const subnet = parts.slice(0, 3).join('.');
        return {
          ...res,
          subnetBurned: subnetMap[subnet] >= 3
        };
      });

      setResults(processedResults);
      toast.success("Infrastructure Audit Complete", { id: toastId });
    } catch (err) {
      console.error("Audit failed:", err);
      toast.error("Oracle Error: Handshake Failure", { id: toastId });
    } finally {
      setIsScanning(false);
      setProgress(100);
    }
  };

  const exportCleanCsv = () => {
    const cleanIps = results.filter(r => r.tier === 4);
    if (cleanIps.length === 0) {
      toast.error("No 100% Clean IPs available for export.");
      return;
    }

    const csvContent = "IP Address,Status,Threat Level,Directive\n" + 
      cleanIps.map(r => `${r.ip},${r.status},${r.tierLabel},${r.directive}`).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clean_IP_Audit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success(`${cleanIps.length} Tier 4 IPs Exported Successfully`);
  };

  const getTierColor = (tier: ThreatTier) => {
    switch (tier) {
      case 1: return 'bg-[#8B0000] text-white border-[#8B0000]'; // Deep Red
      case 2: return 'bg-red-600 text-white border-red-600'; // Bright Red
      case 3: return 'bg-orange-500 text-white border-orange-500'; // Orange
      case 4: return 'bg-green-600 text-white border-green-600'; // Green
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusIcon = (tier: ThreatTier) => {
    if (tier <= 2) return <ShieldAlert size={14} className="text-white" />;
    if (tier === 3) return <AlertTriangle size={14} className="text-white" />;
    return <ShieldCheck size={14} className="text-white" />;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Input Section */}
      <section className="bg-white border border-[#141414] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-widest opacity-40">Mass Audit Input (One IP per line)</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] opacity-30">{input.split('\n').filter(l => l.trim()).length} Targets Loaded</span>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-[#FAFAF9] border border-[#141414] p-4 font-mono text-xs h-40 resize-none focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all"
              placeholder="192.168.1.1&#10;45.78.122.9..."
            />
          </div>

          <div className="w-full md:w-64 flex flex-col gap-3 justify-end pb-1">
            <button
              onClick={auditInfrastructure}
              disabled={isScanning || !input.trim()}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
            >
              {isScanning ? <Activity size={16} className="animate-spin" /> : <Zap size={16} />}
              Audit Infrastructure
            </button>
            <button
              onClick={() => { setInput(''); setResults([]); }}
              className="flex items-center justify-center gap-3 px-6 py-3 border border-[#141414] text-[#141414] font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-neutral-100 transition-all active:scale-95"
            >
              <Trash2 size={16} />
              Clear Terminal
            </button>
            <button
              onClick={exportCleanCsv}
              disabled={results.length === 0}
              className="flex items-center justify-center gap-3 px-6 py-3 border border-green-600 text-green-600 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-green-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Download size={16} />
              Export Clean List
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isScanning && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">Forensic Scan in Progress...</span>
              <span className="font-mono text-[8px] uppercase opacity-40">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-100 overflow-hidden">
              <motion.div 
                className="h-full bg-[#141414]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Results Dashboard */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Grid size={18} className="opacity-40" />
                <h3 className="font-serif italic text-xl">The Truth Table</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#8B0000] rounded-sm" />
                  <span className="font-mono text-[8px] uppercase opacity-40">Fatal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-sm" />
                  <span className="font-mono text-[8px] uppercase opacity-40">Danger</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-sm" />
                  <span className="font-mono text-[8px] uppercase opacity-40">Caution</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-sm" />
                  <span className="font-mono text-[8px] uppercase opacity-40">Safe</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#141414] overflow-hidden">
              <table className="w-full font-mono text-[10px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#141414] text-white uppercase tracking-widest border-b border-[#141414]">
                    <th className="p-4 border-r border-white/10">IP Address</th>
                    <th className="p-4 border-r border-white/10">Status</th>
                    <th className="p-4 border-r border-white/10">Threat Level</th>
                    <th className="p-4 border-r border-white/10">RBL Triggers</th>
                    <th className="p-4 border-r border-white/10">Yahoo Danger</th>
                    <th className="p-4">Team Directive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((res, i) => (
                    <tr key={i} className={`group transition-colors ${res.tier === 1 ? 'bg-[#8B0000]/5 hover:bg-[#8B0000]/10' : res.tier === 2 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-neutral-50'}`}>
                      <td className="p-4 flex flex-col gap-1 border-r border-gray-100">
                        <span className="font-bold text-sm">{res.ip}</span>
                        {res.subnetBurned && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-bold uppercase rounded-sm animate-pulse w-fit">
                            🚨 Subnet Burned
                          </span>
                        )}
                      </td>
                      <td className="p-4 border-r border-gray-100">
                        <div className={`px-2 py-1 inline-flex items-center gap-2 rounded-sm ${getTierColor(res.tier)}`}>
                          {getStatusIcon(res.tier)}
                          <span className="uppercase tracking-widest">{res.status}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold border-r border-gray-100">
                        <span className={res.tier === 1 ? 'text-[#8B0000]' : res.tier === 2 ? 'text-red-600' : res.tier === 3 ? 'text-orange-500' : 'text-green-600'}>
                          Tier {res.tier} - {res.tierLabel}
                        </span>
                      </td>
                      <td className="p-4 border-r border-gray-100 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {res.blacklists.length > 0 ? res.blacklists.map((bl, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-black/5 rounded-sm border border-black/10">
                              {bl}
                            </span>
                          )) : <span className="opacity-30">None</span>}
                        </div>
                      </td>
                      <td className="p-4 italic border-r border-gray-100 opacity-60">
                        {res.yahooDanger}
                      </td>
                      <td className={`p-4 font-bold ${res.tier === 1 ? 'text-[#8B0000]' : res.tier === 2 ? 'text-red-600' : res.tier === 3 ? 'text-orange-500' : 'text-green-600'}`}>
                        {res.directive}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {results.length === 0 && !isScanning && (
        <div className="py-32 border-2 border-dashed border-[#141414] border-opacity-10 rounded-lg flex flex-col items-center justify-center gap-6 opacity-30 grayscale transition-all hover:grayscale-0 hover:opacity-100">
          <Activity size={64} strokeWidth={1} />
          <div className="text-center space-y-2">
            <h4 className="font-serif italic text-2xl">Awaiting Infrastructure Feed</h4>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em]">IP Oracle v11.0 Ready for Mass Audit</p>
          </div>
        </div>
      )}
    </div>
  );
};
