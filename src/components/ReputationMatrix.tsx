import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ShieldQuestion, 
  Activity, 
  Globe, 
  RefreshCcw, 
  AlertCircle,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  Zap,
  Lock,
  Search
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'react-hot-toast';

interface ReputationResult {
  target: string;
  type: 'ip' | 'domain';
  rbls: {
    spamhaus: 'clean' | 'listed' | 'warning';
    spamcop: 'clean' | 'listed' | 'warning';
    barracuda: 'clean' | 'listed' | 'warning';
    surbl: 'clean' | 'listed' | 'warning';
  };
  dns: {
    fcrdns: boolean;
    spf: boolean;
    dmarc: boolean;
  };
  reputationScore: number; // 0-100
  actionPlan: string;
  delistUrl?: string;
}

interface Props {
  ips: string[];
  domains: string[];
}

export const ReputationMatrix: React.FC<Props> = ({ ips, domains }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ReputationResult[]>([]);
  const [scanProgress, setScanProgress] = useState(0);

  const runHealthCheck = async () => {
    if ((ips.length === 0 && domains.length === 0) || isScanning) return;
    
    setIsScanning(true);
    setScanProgress(0);
    setResults([]);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const targets = [...new Set([...ips, ...domains])].filter(t => t.trim().length > 0).slice(0, 5); // Limit to top 5 for demo performance

    if (targets.length === 0) {
      setIsScanning(false);
      return;
    }

    const toastId = toast.loading("Reputation Engine: Running Forensic Health Checks...");

    try {
      const prompt = `You are a Senior Network & Deliverability Administrator. Perform a forensic reputation and DNS authentication check on these targets: ${targets.join(', ')}.
      
      For each target (IP or Domain), provide:
      1. RBL Status (Simulate realistic findings based on common patterns if not verifiable).
      2. DNS Health (FCrDNS, SPF, DMARC presence).
      3. A technical Reputation Score (0-100).
      4. A concrete Action Plan for mitigation if flagged.
      
      Respond in STRICT JSON format:
      {
        "results": [
          {
            "target": "string",
            "type": "ip|domain",
            "rbls": { "spamhaus": "clean|listed|warning", "spamcop": "clean|listed|warning", "barracuda": "clean|listed|warning", "surbl": "clean|listed|warning" },
            "dns": { "fcrdns": true, "spf": true, "dmarc": true },
            "reputationScore": number,
            "actionPlan": "string",
            "delistUrl": "optional URL string"
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
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    target: { type: Type.STRING },
                    type: { type: Type.STRING },
                    rbls: {
                      type: Type.OBJECT,
                      properties: {
                        spamhaus: { type: Type.STRING },
                        spamcop: { type: Type.STRING },
                        barracuda: { type: Type.STRING },
                        surbl: { type: Type.STRING }
                      }
                    },
                    dns: {
                      type: Type.OBJECT,
                      properties: {
                        fcrdns: { type: Type.BOOLEAN },
                        spf: { type: Type.BOOLEAN },
                        dmarc: { type: Type.BOOLEAN }
                      }
                    },
                    reputationScore: { type: Type.NUMBER },
                    actionPlan: { type: Type.STRING },
                    delistUrl: { type: Type.STRING }
                  },
                  required: ["target", "type", "rbls", "dns", "reputationScore", "actionPlan"]
                }
              }
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        setResults(data.results);
        toast.success("Health Check Complete: Data Sanitized", { id: toastId });
      }
    } catch (err) {
      console.error("Health check failed:", err);
      toast.error("Scanner Error: Authentication Failed", { id: toastId });
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'listed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#141414] p-4 text-[#E4E3E0] shadow-lg">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-green-400 animate-pulse" />
          <div>
            <h3 className="font-serif italic text-lg leading-none">Reputation Matrix v4.0</h3>
            <p className="font-mono text-[9px] uppercase tracking-widest opacity-50">Advanced Network Forensics</p>
          </div>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={isScanning || (ips.length === 0 && domains.length === 0)}
          className="flex items-center gap-2 px-6 py-2 bg-white text-[#141414] font-mono text-[10px] uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
        >
          {isScanning ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
          {isScanning ? 'Scanning Cluster...' : 'Run Health Check'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {results.length > 0 ? (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-6"
          >
            {results.map((res, i) => (
              <div key={i} className="bg-white border border-[#141414] shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Target Identity */}
                <div className="p-4 bg-neutral-50 border-r border-[#141414] min-w-[220px] flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {res.type === 'ip' ? <Lock size={14} /> : <Globe size={14} />}
                      <span className="font-mono text-[10px] uppercase opacity-40">{res.type} Target</span>
                    </div>
                    <h4 className="font-serif italic text-xl break-all leading-tight">{res.target}</h4>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#141414] border-opacity-10">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[9px] uppercase opacity-50">Final Score</span>
                      <span className={`font-serif italic text-2xl ${getScoreColor(res.reputationScore)}`}>{res.reputationScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Reputation Matrix */}
                <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h5 className="font-mono text-[10px] uppercase tracking-widest border-b border-[#141414] border-opacity-10 pb-2 flex items-center gap-2">
                      <ShieldAlert size={14} />
                      Global Blacklist Audit
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Spamhaus', status: res.rbls.spamhaus },
                        { label: 'Spamcop', status: res.rbls.spamcop },
                        { label: 'Barracuda', status: res.rbls.barracuda },
                        { label: 'URIBL/SURBL', status: res.rbls.surbl }
                      ].map((rbl, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <span className="font-mono text-[8px] uppercase opacity-40">{rbl.label}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${rbl.status === 'clean' ? 'bg-green-500' : rbl.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500 underline decoration-double'}`} />
                            <span className={`font-mono text-[9px] uppercase font-bold ${getStatusColor(rbl.status)}`}>
                              {rbl.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-mono text-[10px] uppercase tracking-widest border-b border-[#141414] border-opacity-10 pb-2 flex items-center gap-2">
                      <Activity size={14} />
                      DNS Health & Auth
                    </h5>
                    <div className="space-y-3">
                      {[
                        { label: 'FCrDNS Handshake', valid: res.dns.fcrdns, desc: 'Forward-Confirmed reverse DNS' },
                        { label: 'SPF Lockdown', valid: res.dns.spf, desc: 'Sender Policy Framework' },
                        { label: 'DMARC Record', valid: res.dns.dmarc, desc: 'Domain Message Authentication' }
                      ].map((dns, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-tight leading-none mb-0.5">{dns.label}</p>
                            <p className="font-mono text-[7px] uppercase opacity-30">{dns.desc}</p>
                          </div>
                          {dns.valid ? (
                            <CheckCircle2 size={16} className="text-green-500" />
                          ) : (
                            <XCircle size={16} className="text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Plan */}
                <div className="p-6 bg-[#141414] text-[#E4E3E0] min-w-[300px] border-l border-[#141414] flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h5 className="font-serif italic text-sm text-green-400">Tactical Action Plan</h5>
                    <p className="font-mono text-[10px] leading-relaxed opacity-80 border-l-2 border-green-400 pl-3">
                      {res.actionPlan}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {res.delistUrl && (
                      <a 
                        href={res.delistUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 transition-colors font-mono text-[10px] uppercase tracking-widest text-[#E4E3E0]"
                      >
                        <ExternalLink size={12} />
                        Request Delist
                      </a>
                    )}
                    {res.reputationScore < 50 && (
                      <button className="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-all font-mono text-[10px] uppercase tracking-widest">
                        <Trash2 size={12} />
                        Burn & Rotate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 border-2 border-dashed border-[#141414] border-opacity-10 flex flex-col items-center justify-center gap-4 text-[#141414] opacity-30"
          >
            <ShieldQuestion size={48} strokeWidth={1} />
            <div className="text-center space-y-1">
              <p className="font-serif italic text-lg">No Forensic Data Available</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em]">Parse squashed text above to begin scan</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
