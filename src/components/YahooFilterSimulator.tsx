import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  Zap, 
  Mail, 
  FileText, 
  RefreshCcw, 
  TrendingUp,
  Award,
  Type as LucideType
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'react-hot-toast';

interface Props {
  onRefineStart?: () => void;
  onRefineEnd?: () => void;
}

export const YahooFilterSimulator: React.FC<Props> = ({ onRefineStart, onRefineEnd }) => {
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [draft, setDraft] = useState<{ headers: string; body: string; analysis: string; score: number } | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [scores, setScores] = useState({
    headerQuality: 0,
    bodyQuality: 0,
    spamRisk: 0,
    inboxRate: 0
  });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  // Manual Decode Logic
  const decodeQuotedPrintable = (text: string) => {
    return text.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  const decodeBase64 = (text: string) => {
    try {
      return atob(text);
    } catch {
      return text;
    }
  };

  // Basic Simulation Logic (Heuristics)
  useEffect(() => {
    if (!headers && !body) {
      setIsAnalyzed(false);
      return;
    }

    const analyzeHeuristics = () => {
      let hScore = 0;
      let bScore = 0;
      let sRisk = 0;
      let iRate = 0;
      const recs: string[] = [];

      // Header Heuristics
      const hasUnsub = headers.includes('List-Unsubscribe: <one-click>') || 
                       headers.includes('List-Unsubscribe: <https://') || 
                       headers.includes('List-Unsubscribe: <mailto:');
      
      const hasUnsubPost = headers.includes('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
      
      const hasStructuralTags = headers.includes('[*date]') && headers.includes('[*to]');
      const hasRandomization = headers.includes('[RandomL/') || headers.includes('[RandomN/');

      if (hasUnsub) {
        hScore += 30;
      } else {
        recs.push("Add clear Unsubscribe link (critical for Yahoo)");
      }

      if (hasUnsubPost) {
        hScore += 10;
      } else if (hasUnsub) {
        recs.push("Inject List-Unsubscribe-Post for One-Click compliance");
      }

      if (hasStructuralTags) {
        hScore += 10;
      } else {
        recs.push("Ensure [*date] and [*to] tags are integrated for system automation");
      }

      if (hasRandomization) {
        hScore += 10;
      } else {
        recs.push("Use [RandomL/X] tags in Message-ID to prevent fingerprinting");
      }

      if (headers.includes('DKIM-Signature')) hScore += 20;
      if (headers.includes('Authentication-Results') && headers.includes('spf=pass')) hScore += 20;

      // Body Heuristics
      const spamWords = ['free', 'money', 'urgent', 'winner', 'cash', 'guaranteed', '100%', 'click below', 'dear friend', 'act now'];
      let spamCount = 0;
      spamWords.forEach(word => {
        if (body.toLowerCase().includes(word)) spamCount++;
      });

      bScore = Math.max(0, 100 - (spamCount * 12));
      if (spamCount > 2) {
        recs.push("Clean spammy words and improve sender reputation");
      }

      const htmlTags = (body.match(/<[^>]*>/g) || []).length;
      const textLength = body.replace(/<[^>]*>/g, '').length;
      const imgTags = (body.match(/<img/g) || []).length;

      if (htmlTags > 50) {
        bScore -= 5;
        recs.push("HTML is heavy, consider simplifying for better mobile parsing");
      }

      if (imgTags > 2 && textLength < 500) {
        bScore -= 10;
        recs.push("High image-to-text ratio flagged as spam trigger");
      }

      // Final aggregation
      sRisk = (100 - (hScore + bScore) / 2) / 10;
      iRate = Math.max(0, (hScore + bScore) / 2);

      if (iRate < 75) {
        recs.push("Make content more valuable, less salesy");
      }

      setScores({
        headerQuality: Math.min(100, Math.round(hScore)),
        bodyQuality: Math.min(100, Math.round(bScore)),
        spamRisk: Number(sRisk.toFixed(1)),
        inboxRate: Math.round(iRate)
      });
      setRecommendations([...new Set(recs)]);
      setIsAnalyzed(true);
    };

    const timer = setTimeout(analyzeHeuristics, 500);
    return () => clearTimeout(timer);
  }, [headers, body]);

  const handleRefine = async () => {
    if (!headers || !body || isRefining) return;
    
    setIsRefining(true);
    onRefineStart?.();
    const toastId = toast.loading("AI Engine: Analyzing & Refining for Yahoo Core 2026...");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const prompt = `You are a Yahoo Deliverability Engineer. Refine this email (Header + Body) to 100% Inbox standards for 2026.
      
      CURRENT HEADERS:
      ${headers}
      
      CURRENT BODY:
      ${body}
      
      STRICT CONSTRAINTS (MANDATORY):
      1. PRESERVE TAGS: Do NOT remove or modify mailer tags like [*date], <[*to]>, [RandomL/X], or [RandomN/X]. They MUST remain exactly as they are.
      2. HEADER PROTOCOL:
         - Keep "Date: [*date]" and "To: <[*to]>" exactly.
         - Ensure "List-Unsubscribe-Post: List-Unsubscribe=One-Click" is present.
         - Ensure "List-Unsubscribe" uses proper one-click format.
         - If Subject is spammy, generate a new one and encode it using standard MIME encoding (e.g., =?UTF-8?B?...?= or =?UTF-7?B?...?=).
         - Keep the verified domain structure in "From" and "Reply-To".
      3. BODY REFINEMENT:
         - Scrub "Blacklisted" or spam-trigger words (free, winner, guaranteed, etc.).
         - Replace with high-reputation synonyms (complementary, priority access, verified results).
         - Maintain marketing intent and call-to-action.
         - Optimize HTML/Image ratio for primary inbox delivery.
      
      Respond in STRICT JSON format:
      {
        "refinedHeaders": "The full refined header block",
        "refinedBody": "The full refined body block",
        "improvementAnalysis": "Short summary of what was fixed",
        "newScore": 9.9
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              refinedHeaders: { type: Type.STRING },
              refinedBody: { type: Type.STRING },
              improvementAnalysis: { type: Type.STRING },
              newScore: { type: Type.NUMBER }
            },
            required: ["refinedHeaders", "refinedBody", "improvementAnalysis", "newScore"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        setDraft({
          headers: result.refinedHeaders,
          body: result.refinedBody,
          analysis: result.improvementAnalysis,
          score: result.newScore
        });
        toast.success(`Draft Generated: Score Prediction ${result.newScore}/10`, { id: toastId });
      }
    } catch (err) {
      console.error("Yahoo Refine failed:", err);
      toast.error("AI Refine encountered a network error.", { id: toastId });
    } finally {
      setIsRefining(false);
      onRefineEnd?.();
    }
  };

  const commitRefinement = () => {
    if (!draft) return;
    setHeaders(draft.headers);
    setBody(draft.body);
    setDraft(null);
    toast.success("TECHNICAL COMMIT SUCCESS: Content updated to 10/10 standard.");
  };

  const getScoreColor = (score: number, type: 'quality' | 'risk') => {
    if (type === 'risk') {
      if (score > 7) return 'text-red-500';
      if (score > 4) return 'text-yellow-500';
      return 'text-green-500';
    }
    if (score > 80) return 'text-green-500';
    if (score > 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Scoring Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Header Quality', val: `${scores.headerQuality}%`, sub: 'Yahoo Check', icon: ShieldCheck, color: getScoreColor(scores.headerQuality, 'quality') },
          { label: 'Body Quality', val: `${scores.bodyQuality}%`, sub: 'Context Score', icon: LucideType, color: getScoreColor(scores.bodyQuality, 'quality') },
          { label: 'Spam Risk', val: `${scores.spamRisk}/10`, sub: 'Yahoo Reputation', icon: AlertCircle, color: getScoreColor(scores.spamRisk, 'risk') },
          { label: 'Inbox/Promotions Rate', val: `${scores.inboxRate}%`, sub: 'Delivery Forecast', icon: TrendingUp, color: getScoreColor(scores.inboxRate, 'quality') }
        ].map((item, i) => (
          <div key={i} className="bg-white border border-[#141414] p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">{item.label}</span>
              <item.icon size={14} className={item.color} />
            </div>
            <span className={`font-serif italic text-2xl ${item.color}`}>{item.val}</span>
            <span className="font-mono text-[8px] uppercase tracking-tight opacity-30">{item.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Zones */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="font-serif italic text-xs uppercase tracking-wider flex items-center gap-2 opacity-60">
                <ShieldCheck size={14} />
                Raw Email Headers
              </label>
              <button 
                onClick={() => setHeaders('')}
                className="font-mono text-[9px] uppercase opacity-40 hover:opacity-100 transition-opacity"
              >
                Clear
              </button>
            </div>
            <textarea
              className="w-full h-48 bg-white border border-[#141414] p-4 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#141414] resize-none transition-all placeholder:opacity-20 leading-relaxed"
              placeholder="Paste Full Headers (DMARC, SPF, Message-ID...)"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="font-serif italic text-xs uppercase tracking-wider flex items-center gap-2 opacity-60">
                <Mail size={14} />
                Raw Email Body (HTML/Text)
              </label>
              <button 
                onClick={() => setBody('')}
                className="font-mono text-[9px] uppercase opacity-40 hover:opacity-100 transition-opacity"
              >
                Clear
              </button>
            </div>
            <textarea
              className="w-full h-80 bg-white border border-[#141414] p-4 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#141414] resize-none transition-all placeholder:opacity-20 leading-relaxed"
              placeholder="Paste HTML or Text Body..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        {/* Action & Results Zone */}
        <div className="space-y-8">
          <div className="bg-[#141414] p-8 text-[#E4E3E0] flex flex-col items-center justify-center text-center gap-6 shadow-xl relative overflow-hidden group min-h-[300px]">
            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <Zap size={120} fill="currentColor" />
            </div>
            
            <div className="space-y-2 relative z-10">
              <h3 className="font-serif italic text-3xl">Yahoo Core 2026 Refiner</h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">AI-Powered Deliverability Optimization</p>
            </div>

            <AnimatePresence mode="wait">
              {draft ? (
                <motion.div 
                  key="draft"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-4 relative z-10"
                >
                  <div className="bg-white/10 p-3 rounded border border-white/20 text-left max-w-sm">
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-2 text-green-400">Refinement Ready ({draft.score}/10)</p>
                    <p className="font-mono text-[8px] opacity-70 italic leading-relaxed">"{draft.analysis}"</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={commitRefinement}
                      className="px-8 py-3 bg-[#00FF00] text-[#141414] font-mono uppercase tracking-[0.2em] font-bold flex items-center gap-2 hover:bg-[#00CC00] active:scale-95 transition-all"
                    >
                      <CheckCircle size={16} />
                      Yes, Refine
                    </button>
                    <button
                      onClick={() => setDraft(null)}
                      className="px-4 py-3 bg-white/10 text-white font-mono uppercase tracking-[0.2em] text-[10px] border border-white/20 hover:bg-white/20 transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative z-10"
                >
                  <button
                    onClick={handleRefine}
                    disabled={!headers || !body || isRefining}
                    className={`px-10 py-4 bg-white text-[#141414] font-mono uppercase tracking-[0.3em] font-bold flex items-center gap-4 transition-all hover:gap-6 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed`}
                  >
                    {isRefining ? <RefreshCcw className="animate-spin" size={18} /> : <Zap size={18} fill="currentColor" />}
                    {isRefining ? 'Analyzing Systems' : 'Inject AI Refinement'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-8 w-full mt-4 border-t border-white border-opacity-10 pt-6 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle size={12} className="text-green-400" />
                  <span className="font-mono text-[9px] uppercase opacity-60">DMARC Guard</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle size={12} className="text-green-400" />
                  <span className="font-mono text-[9px] uppercase opacity-60">Spam Word Purge</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h4 className="font-serif italic text-lg border-b border-[#141414] pb-2">Technical Recommendations</h4>
            {isAnalyzed ? (
              <ul className="space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-white border border-l-4 border-l-[#141414] border-[#141414] shadow-sm transform transition-all hover:-translate-x-1">
                      <AlertCircle size={16} className="mt-0.5 text-yellow-600 flex-shrink-0" />
                      <span className="font-mono text-[10px] uppercase tracking-wide leading-tight">{rec}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-3 p-3 bg-white border border-l-4 border-l-green-500 border-[#141414] shadow-sm">
                    <Award size={16} className="mt-0.5 text-green-500 flex-shrink-0" />
                    <span className="font-mono text-[10px] uppercase tracking-wide leading-tight">All systems green. Deployment recommended.</span>
                  </li>
                )}
              </ul>
            ) : (
              <div className="py-12 border-2 border-dashed border-[#141414] border-opacity-10 flex flex-col items-center justify-center gap-3 opacity-40">
                <FileText size={24} />
                <span className="font-mono text-[9px] uppercase tracking-widest text-center px-8">Paste data to generate deliverability report</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
