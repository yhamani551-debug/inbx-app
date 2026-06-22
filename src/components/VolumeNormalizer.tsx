import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const VolumeNormalizer: React.FC = () => {
  const [input, setInput] = useState('');
  const [normalized, setNormalized] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!input.trim()) {
      setNormalized(null);
      return;
    }

    const cleanInput = input.trim().toLowerCase();
    let value = parseFloat(cleanInput.replace(/[km]/g, ''));
    
    if (isNaN(value)) {
      setNormalized(null);
      return;
    }

    if (cleanInput.endsWith('m')) {
      // Rule 3: M Shorthand -> Multiply by 1000
      setNormalized((value * 1000).toString());
    } else if (cleanInput.endsWith('k')) {
      // Rule 2: K Shorthand -> Keep base
      setNormalized(value.toString());
    } else {
      // Rule 1: Raw Number -> Divide by 1000
      setNormalized((value / 1000).toString());
    }
  }, [input]);

  const handleCopy = () => {
    if (!normalized) return;
    navigator.clipboard.writeText(normalized);
    setCopied(true);
    toast.success("Volume Normalized & Copied to Clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#141414] border-l-4 border-l-green-400 p-4 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <Calculator size={18} className="text-green-400" />
        <div>
          <h4 className="font-serif italic text-sm text-[#E4E3E0]">Volume Normalizer</h4>
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#E4E3E0] opacity-40">K-Unit Converter v1.0</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="font-mono text-[9px] uppercase text-[#E4E3E0] opacity-30">Raw Input (e.g. 1.5M, 30, 20K)</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-2 font-mono text-xs text-green-400 focus:outline-none focus:border-green-400/50 transition-colors"
            placeholder="30 or 1.5M..."
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-[9px] uppercase text-[#E4E3E0] opacity-30">Normalized K-Unit</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-white/10 border border-white/20 p-2 font-mono text-sm text-white min-h-[36px] flex items-center">
              {normalized || '---'}
            </div>
            <button
              onClick={handleCopy}
              disabled={!normalized}
              className={`px-4 flex items-center justify-center transition-all ${
                normalized ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer' : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5">
          <p className="font-mono text-[7px] text-[#E4E3E0] opacity-20 uppercase leading-relaxed">
            * 30 → 0.03 (Raw / 1000)<br />
            * 1K → 1 (Base)<br />
            * 1M → 1000 (Base * 1000)
          </p>
        </div>
      </div>
    </div>
  );
};
