/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Toaster, toast } from 'react-hot-toast';
import { 
  ClipboardCopy, 
  Play, 
  Trash2, 
  Check, 
  FileText, 
  AlertCircle,
  Info,
  CheckCircle,
  Award,
  TrendingUp,
  Repeat,
  Server,
  Globe,
  Hash,
  Network,
  Search,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
  Type as LucideType,
  Code,
  Upload,
  Zap,
  Tag,
  Smile,
  Sparkles,
  RefreshCcw,
  Eye,
  Layers,
  Monitor,
  Maximize2,
  Image as LucideImage,
  Download,
  Activity,
  DollarSign,
  X,
  Image,
  Terminal,
  ExternalLink,
  Table as TableIcon,
  Database,
  History,
  Plus,
  Settings,
  Grid
} from 'lucide-react';

import { format } from 'date-fns';
import { useLedger } from './hooks/useLedger';
import { LedgerTable } from './components/LedgerTable';
import { SheetImporter } from './components/SheetImporter';
import { YahooFilterSimulator } from './components/YahooFilterSimulator';
import { ReputationMatrix } from './components/ReputationMatrix';
import { VolumeNormalizer } from './components/VolumeNormalizer';
import { IPOracleMatrix } from './components/IPOracleMatrix';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './services/firebase';

type TabType = 'parser' | 'email' | 'creative' | 'htmlToImage' | 'newsletter' | 'mixmaster' | 'dynamicHeader' | 'commander' | 'ledger' | 'yahooSimulator' | 'ipOracle';
type OutputType = 'serverIds' | 'ips' | 'domains' | 'rdns' | 'ispMapping';

const SCIENCE_WORDS = [
  'atom', 'orbit', 'gene', 'plasma', 'tech', 'logic', 'quantum', 'nebula', 'gravity', 'evolution', 
  'photon', 'boson', 'isotope', 'reaction', 'energy', 'matter', 'nucleus', 'quarks', 'entropy', 'stasis'
];
const MATH_WORDS = [
  'ratio', 'vector', 'matrix', 'delta', 'prime', 'axis', 'scalar', 'fractal', 'integer', 'entropy', 
  'cosine', 'tangent', 'algebra', 'limit', 'radius', 'vertex', 'binary', 'tensor', 'affine', 'metric'
];
const SPORT_WORDS = [
  'sprint', 'apex', 'track', 'field', 'goal', 'pivot', 'cycle', 'swing', 'drill', 'match', 
  'score', 'league', 'rally', 'serve', 'pitch', 'block', 'strike', 'dodge', 'jump', 'vault'
];

const ALL_BURN_WORDS = [...SCIENCE_WORDS, ...MATH_WORDS, ...SPORT_WORDS];

const CATEGORIES_DATA = {
  FINANCE: {
    label: 'FINANCE/CRYPTO',
    weight: 10,
    keywords: ['stocks', 'bitcoin', 'market', 'trading', 'dividend', 'inflation', 'portfolio', 'wallet', 'fed', 'bearish'],
    names: ['Market Alpha', 'The Dividend Desk', 'Portfolio Pro', 'Crypto Ledger', 'Fiscal Watch', 'Wealth Navigator', 'Asset Insights', 'Trading Floor', 'Economic Pulse', 'Capital Core'],
    subjects: ['Daily Market Advantage', 'Bitcoin Trend Alert', 'Dividend Strategy Ready', 'Inflation Protection Report', 'Your Portfolio Insight', 'Wallet Security Update', 'Fed Meeting Summary', 'Bearish Market Indicators', 'Trading Signal Analysis', 'Fiscal Forecast Monthly']
  },
  HEALTH: {
    label: 'HEALTH/WELLNESS',
    weight: 10,
    keywords: ['keto', 'fitness', 'supplements', 'workout', 'weight loss', 'nutrition', 'diet', 'mental health', 'recipe'],
    names: ['Keto Daily', 'The Fitness Lab', 'Vitality Digest', 'Wellness Hub', 'Nutrition Scout', 'Mind & Body Co', 'Active Guide', 'Pure Health', 'Zen Path', 'Longevity Lab'],
    subjects: ['Optimized Keto Plan', 'Peak Fitness Challenge', 'Supplement Integrity Review', 'Daily Workout Routine', 'Sustainable Weight Loss', 'Advanced Nutrition Guide', 'New Diet Breakthrough', 'Mental Health Focus', 'Secret Healthy Recipe', 'Vitality Booster Tips']
  },
  POLITICS: {
    label: 'GLOBAL NEWS/POLITICS',
    weight: 10,
    keywords: ['war', 'trump', 'election', 'crisis', 'border', 'senate', 'cease-fire', 'geopolitics', 'president'],
    names: ['The World Ledger', 'Global Pulse Daily', 'The International Brief', 'Capital Insider', 'Geopolitical Review', 'Border News Network', 'Asia-Pacific Digest', 'Presidential Pulse', 'Crisis Command', 'Conflict Monitor'],
    subjects: ['Critical Border Situation Alert', 'Global Geopolitics Brief', 'The International Briefing', 'World Conflict Analysis', 'Asia-Pacific Trade Report', 'Presidential Policy Update', 'Global News Round-Up', 'Geopolitical Strategy Note', 'The Ledger: World Pulse', 'International Crisis Report']
  },
  TECH: {
    label: 'TECH/SOFTWARE',
    weight: 10,
    keywords: ['ai', 'saas', 'coding', 'developer', 'cybersecurity', 'nvidia', 'cloud', 'app', 'robot', 'hardware'],
    names: ['Tech Radar', 'System Monitor', 'Cloud Architect', 'Data Insight', 'Security Core', 'AI Navigator', 'Node Support', 'Digital Stack', 'Quantum Lab', 'DevOps Hub'],
    subjects: ['Critical System Update', 'AI Performance Report', 'Cloud Infrastructure Alert', 'Network Security Brief', 'Tech Innovation Digest', 'API Usage Statistics', 'Data Integrity Check', 'Software Version Release', 'System Health Monitor', 'Digital Transformation News']
  },
  MARKETING: {
    label: 'MARKETING/B2B',
    weight: 10,
    keywords: ['seo', 'conversion', 'lead gen', 'brand', 'campaign', 'roi', 'webinar', 'client', 'funnel', 'sales'],
    names: ['Marketing Insights', 'Growth Lab', 'Campaign Hub', 'SEO Insider', 'Traffic Expert', 'Conversion Desk', 'Lead Gen Pro', 'Strategy Central', 'Brand Pulse', 'Digital Edge'],
    subjects: ['Advanced SEO Blueprint', 'Conversion Rate Catalyst', 'Lead Generation Success', 'Brand Strategy Brief', 'Campaign Optimization Log', 'ROI Maximizer Report', 'Exclusive Webinar Access', 'Client Relations Update', 'Funnel Analytics Deep-Dive', 'Sales Performance Review']
  },
  LIFESTYLE: {
    label: 'LIFESTYLE/TRAVEL',
    weight: 8,
    keywords: ['hotel', 'flight', 'aviation', 'destination', 'fashion', 'interior', 'decor', 'vacation', 'resort'],
    names: ['The Wanderlust', 'Globe Trotter', 'Resort Reviewer', 'Destination Scout', 'Style Haven', 'Decor Daily', 'Interior Insider', 'Aviation Weekly', 'Luxury Vacation', 'Leisure Lane'],
    subjects: ['Unbeatable Hotel Deals', 'Next Destination Found', 'Resort Stay Spotlight', 'Aviation Industry News', 'Flight Safety Bulletin', 'Spring Fashion Trends', 'Interior Design Secrets', 'Luxury Vacation Planner', 'Travel Itinerary Draft', 'Globe Trotter Guide']
  },
  SELF_IMPROVEMENT: {
    label: 'SELF-IMPROVEMENT',
    weight: 8,
    keywords: ['productivity', 'habits', 'career', 'focus', 'mindset', 'skills', 'learning', 'growth'],
    names: ['Peak Performance', 'Habit Hacker', 'Mindset Mentor', 'Career Catalyst', 'Focus Finder', 'Skills Lab', 'Growth Guide', 'Success Circle', 'Daily Discipline', 'Mastery Path'],
    subjects: ['Productivity Hacks Daily', 'New Habit Loop', 'Career Advancement Path', 'Focus & Clarity Exercise', 'Positive Mindset Shift', 'Expert Skills Mastery', 'Mastering Your Learning', 'Personal Growth Journey', 'Success Routine Ready', 'Professional Mastery Alert']
  },
  REAL_ESTATE: {
    label: 'REAL ESTATE',
    weight: 8,
    keywords: ['mortgage', 'housing', 'property', 'listings', 'realtor', 'rent', 'investment', 'equity'],
    names: ['Property Pulse', 'Housing Market Watch', 'Equity Insider', 'Mortgage Mentor', 'Listing Lab', 'Realtor Report', 'Rent Review', 'Investment Estate', 'Homefront News', 'Acreage Analyst'],
    subjects: ['New Listing Notification', 'Mortgage Rate Snapshot', 'Investment Property Prep', 'Housing Market Analysis', 'Equity Growth Report', 'Realtor Insider Tips', 'Rent Market Trends', 'Property Value Update', 'Real Estate Opportunities', 'Homeownership Guide']
  },
  ENTERTAINMENT: {
    label: 'ENTERTAINMENT',
    weight: 8,
    keywords: ['movie', 'gaming', 'celebrity', 'music', 'review', 'streaming', 'netflix', 'series', 'pop culture'],
    names: ['Pop Pulse', 'Cinema Scoop', 'Streaming Star', 'Gaming Grid', 'Music Mix', 'Series Sneak', 'Celebrity Circuit', 'Review Reel', 'Culture Club', 'Fandom Focus'],
    subjects: ['Must-Watch Movie Review', 'New Gaming Preview', 'Exclusive Celebrity News', 'Music Industry Update', 'Streaming Service Guide', 'Next Big Series', 'Pop Culture Deep-Dive', 'Netflix Original Spotlight', 'Top Tier Reviews', 'Fan Community Highlight']
  },
  GENERIC: {
    label: 'GENERAL BUSINESS',
    weight: 1,
    keywords: [],
    names: ['Support Team', 'Client Relations', 'Operations Dept', 'Project Task', 'Internal Memo', 'Document Center', 'Account Desk', 'Service Notice', 'Status Update', 'Review Team'],
    subjects: ['General Project Update', 'Account Verification Notice', 'Action Required: Review', 'System Notification Ready', 'Important: Internal Memo', 'Service Status Report', 'Document Completion Alert', 'Review Cycle Update', 'Important Reference Info', 'Weekly Activity Summary']
  }
};

export default function App() {
  const [activeTab, setActiveTab ] = useState<TabType>('parser');
  
  // Tab 1: Parser State
  const [input, setInput] = useState('');
  const [outputs, setOutputs] = useState({
    serverIds: '',
    ips: '',
    domains: '',
    rdns: '',
    ispMapping: ''
  });
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isIspLookupActive, setIsIspLookupActive] = useState(false);
  const [ispStatus, setIspStatus] = useState<string>('');

  // Tab 2: Email Sanitizer State
  const [htmlInput, setHtmlInput] = useState('');
  const [cleanHtml, setCleanHtml] = useState('');
  const [decodeError, setDecodeError] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [removeAllText, setRemoveAllText] = useState(false);
  
  // Tab 6: Mix Master State
  const [mixMasterInputA, setMixMasterInputA] = useState<string | null>(null);
  const [mixMasterInputB, setMixMasterInputB] = useState<string | null>(null);
  const [mixMasterInputC, setMixMasterInputC] = useState<string | null>(null);
  const [revenueInput, setRevenueInput] = useState<string>('');
  const [mixMasterResult, setMixMasterResult] = useState<any>(null);
  const [isAnalyzingMix, setIsAnalyzingMix] = useState(false);
  const [lastSyncRef, setLastSyncRef] = useState<{ [key: string]: number }>({});
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Tab 7: Dynamic Header State
  const [senderEmail, setSenderEmail] = useState('');
  const [dynamicFromName, setDynamicFromName] = useState('Bookstr');
  const [dynamicSubject, setDynamicSubject] = useState('Your Subject Here');
  const [headerOutput, setHeaderOutput] = useState('');
  const [includeReplyTo, setIncludeReplyTo] = useState(true);
  const [includeListUnsubscribeEmail, setIncludeListUnsubscribeEmail] = useState(true);
  const [includeListUnsubscribePost, setIncludeListUnsubscribePost] = useState(true);
  const [includeBoundary, setIncludeBoundary] = useState(false);
  const [boundaryValue, setBoundaryValue] = useState('----Boundary_30129');
  const [includeReceived, setIncludeReceived] = useState(false);
  const [receivedIp, setReceivedIp] = useState('207.171.190.8');
  const [receivedRelay, setReceivedRelay] = useState('mm-notify-out-103.amazon.com');
  const [receivedEnvelopeFrom, setReceivedEnvelopeFrom] = useState('');
  const [customHeaders, setCustomHeaders] = useState<{ id: string; key: string; value: string }[]>([]);

  // Tab 8: Operations Commander State
  const [activeWorkflow, setActiveWorkflow] = useState<string>('warmup');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  const availableRemovalTags = [
    'a', 'div', 'span', 'p', 'table', 'tr', 'td', 'th', 'ul', 'ol',
    'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'button', 'input',
    'form', 'label', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main'
  ];

  const toggleTagRemoval = (tag: string) => {
    setTagsToRemove(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  
  // Copy States
  const [emailCopied, setEmailCopied] = useState(false);
  const [aliasesCopied, setAliasesCopied] = useState(false);
  const [subjectCopied, setSubjectCopied] = useState(false);
  const [nameCopied, setNameCopied] = useState(false);
  const [senderEmailCopied, setSenderEmailCopied] = useState(false);

  // Analysis State
  const [detectedCategory, setDetectedCategory] = useState<keyof typeof CATEGORIES_DATA>('GENERIC');
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [memoryBank, setMemoryBank] = useState<{name: string, subject: string}[]>([]);
  const [bankIndex, setBankIndex] = useState(0);

  // Alias Vault: For uniqueness across millions of senders
  const [usedAliases, setUsedAliases] = useState<Set<string>>(new Set());

  useEffect(() => {
    const vault = localStorage.getItem('used_aliases_vault');
    if (vault) {
      try {
        const arr = JSON.parse(vault);
        if (Array.isArray(arr)) setUsedAliases(new Set(arr));
      } catch (e) {
        console.error("Vault corruption:", e);
      }
    }
  }, []);

  const markAliasesAsUsed = useCallback((newAliases: string[]) => {
    setUsedAliases(prev => {
      const next = new Set(prev);
      newAliases.forEach(a => next.add(a.split('@')[0])); // Store just the alias part
      
      const arr = Array.from(next);
      // Safety cap at 80,000 entries (~3-4MB in localStorage)
      const cap = arr.length > 80000 ? arr.slice(-80000) : arr;
      localStorage.setItem('used_aliases_vault', JSON.stringify(cap));
      return new Set(cap);
    });
  }, []);

  const generateUniqueAliases = useCallback((count: number, currentUsed: Set<string>) => {
    const newAliases = new Set<string>();
    let attempts = 0;
    while (newAliases.size < count && attempts < 2000) {
      attempts++;
      const aliasWords: string[] = [];
      const wordPool = [...ALL_BURN_WORDS];
      // Generate 4-word combinations (approx 12.9M possibilities)
      for (let j = 0; j < 4; j++) {
        const idx = Math.floor(Math.random() * wordPool.length);
        aliasWords.push(wordPool.splice(idx, 1)[0]);
      }
      const alias = aliasWords.join('');
      if (!currentUsed.has(alias) && !newAliases.has(`${alias}@example.com`)) {
        newAliases.add(`${alias}@example.com`);
      }
    }
    return Array.from(newAliases);
  }, []);

  // Tab 3: Creative Analysis State
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [creativeBase64, setCreativeBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [creativeAnalysis, setCreativeAnalysis] = useState<{
    niche: string;
    vibe: string;
    emotion: string;
    fromNames: string[];
    subjectLines: string[];
  } | null>(null);
  const [creativeCopyStates, setCreativeCopyStates] = useState<Record<string, boolean>>({});
  const [dragActive, setDragActive] = useState(false);

  // Tab 4: HTML To Image State
  const [htmlToImageContent, setHtmlToImageContent] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageSpecs, setImageSpecs] = useState<{ resolution: string, size: string } | null>(null);
  const conversionRef = useRef<HTMLDivElement>(null);

  // Tab 5: Newsletter Metadata State
  const [newsletterInput, setNewsletterInput] = useState('');
  const [isAnalyzingNewsletter, setIsAnalyzingNewsletter] = useState(false);
  const [newsletterMetadata, setNewsletterMetadata] = useState<{
    hook: string;
    promise: string;
    anchors: string[];
    cta: string;
    brand: string;
    fromNames: string[];
    subjectLines: string[];
  } | null>(null);
  const [newsletterCopyStates, setNewsletterCopyStates] = useState<Record<string, boolean>>({});

  const generateRandomString = useCallback((length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  const lastExtractedHtml = useRef('');

  // High-Fidelity UTF-8 Quoted-Printable Decoder
  const decodeQP = useCallback((text: string) => {
    // 1. Remove soft line breaks (standard QP artifacts)
    let qp = text.replace(/=\r?\n/g, '').replace(/=\n/g, '');
    
    // 2. Convert to byte array
    const bytes: number[] = [];
    for (let i = 0; i < qp.length; i++) {
      if (qp[i] === '=' && i + 2 < qp.length) {
        const hex = qp.substring(i + 1, i + 3);
        if (/^[0-9A-F]{2}$/i.test(hex)) {
          bytes.push(parseInt(hex, 16));
          i += 2;
          continue;
        } else if (qp[i+1] === '\r' || qp[i+1] === '\n') {
          // Extra cleanup for malformed soft breaks
          i++; 
          if (qp[i] === '\r' && qp[i+1] === '\n') i++;
          continue;
        }
      }
      bytes.push(qp.charCodeAt(i));
    }

    // 3. Decode as UTF-8
    let decoded = '';
    try {
      decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (e) {
      console.error('QP Decoding failed, falling back to basic ASCII', e);
      decoded = String.fromCharCode(...bytes);
    }
    
    // Final check: Remove artifacts if any (trailing '=')
    if (decoded.endsWith('=')) {
      decoded = decoded.slice(0, -1);
    }

    return decoded;
  }, []);

  const sanitizeHtml = useCallback((html: string) => {
    if (typeof html !== 'string' || !html.trim()) return '';
    
    let decoded = html;
    // Force decode if any QP markers are found to ensure UTF-8 "Webatic" standard
    if (decoded.includes('=3D') || decoded.includes('=\n') || decoded.includes('=\r\n') || decoded.includes('=0A') || decoded.includes('=20')) {
      decoded = decodeQP(decoded);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, 'text/html');

    // 0. User-Requested Tag Removal
    tagsToRemove.forEach(tag => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach(el => {
        el.remove();
      });
    });

    // 0.1 Remove All Text (Nuclear Option)
    if (removeAllText) {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
      let node;
      const nodesToEmpty = [];
      while (node = walker.nextNode()) {
        nodesToEmpty.push(node);
      }
      nodesToEmpty.forEach(textNode => {
        textNode.textContent = '';
      });
    }

    // 1. Agnostic Tracker Removal
    const allImgs = doc.querySelectorAll('img');
    allImgs.forEach(img => {
      const wStr = (img.getAttribute('width') || '').toLowerCase().trim();
      const hStr = (img.getAttribute('height') || '').toLowerCase().trim();
      const style = (img.getAttribute('style') || '').toLowerCase();
      const src = (img.getAttribute('src') || '').toLowerCase();
      
      const isWSmall = wStr === '1' || wStr === '1px' || wStr === '0' || wStr === '0px';
      const isHSmall = hStr === '1' || hStr === '1px' || hStr === '0' || hStr === '0px';
      
      // Rule: Both width and height are "1" or "0"
      const isTiny = isWSmall && isHSmall;
      
      const isHiddenByStyle = (
        style.includes('display:none') || 
        style.includes('visibility:hidden') || 
        style.includes('opacity:0')
      );

      // Tracking Keywords
      const isTrackerUrl = (
        src.includes('/pixel') || 
        src.includes('/open') || 
        src.includes('/track') ||
        src.includes('/dot')
      );

      // Check parent containers for hidden state
      let parentHidden = false;
      let currentParent = img.parentElement;
      while (currentParent && currentParent.tagName !== 'BODY') {
        const pStyle = (currentParent.getAttribute('style') || '').toLowerCase();
        if (pStyle.includes('display:none') || pStyle.includes('visibility:hidden')) {
          parentHidden = true;
          break;
        }
        currentParent = currentParent.parentElement;
      }

      if (isTiny || isHiddenByStyle || isTrackerUrl || parentHidden) {
        const parent = img.parentElement;
        img.remove();
        
        // Delete immediate parent if it is an empty <a>, <div>, or <span>
        if (parent && (parent.tagName === 'A' || parent.tagName === 'DIV' || parent.tagName === 'SPAN')) {
          if (parent.innerHTML.trim() === '') {
            parent.remove();
          }
        }
      }
    });

    // 2. Global Link Stripping (Unwrapping)
    const allLinks = doc.querySelectorAll('a');
    allLinks.forEach(link => {
      const parent = link.parentNode;
      if (parent) {
        while (link.firstChild) {
          parent.insertBefore(link.firstChild, link);
        }
        parent.removeChild(link);
      }
    });

    // 3. Whole Bottle Rule: Return the full document logic
    let finalHtml = doc.documentElement.outerHTML;

    // 4. Verification: Ensure DOCTYPE exists
    if (!finalHtml.toLowerCase().startsWith('<!doctype')) {
      finalHtml = '<!DOCTYPE html>\n' + finalHtml;
    }

    return finalHtml;
  }, [decodeQP, tagsToRemove, removeAllText]);

  const analyzeContextAndGenerateBank = useCallback((htmlSource: string) => {
    if (typeof htmlSource !== 'string' || !htmlSource.trim()) {
       setMemoryBank([]);
       setCleanHtml('');
       return;
    }
    
    if (htmlSource === lastExtractedHtml.current) return;
    lastExtractedHtml.current = htmlSource;

    let source = htmlSource;
    if (source.includes('=3D') || source.includes('=\n') || source.includes('=\r\n') || source.includes('=0A') || source.includes('=20')) {
      source = decodeQP(source);
    }

    // Weighted Concept Analyzer
    const plainText = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();

    let scores: Record<string, number> = {};
    (Object.keys(CATEGORIES_DATA) as Array<keyof typeof CATEGORIES_DATA>).forEach(cat => {
      const data = CATEGORIES_DATA[cat];
      let score = 0;
      data.keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, 'g');
        const count = (plainText.match(regex) || []).length;
        score += count * (data.weight as number);
      });
      scores[cat] = score;
    });

    let bestCategory = 'GENERIC' as keyof typeof CATEGORIES_DATA;
    let maxScore = 0;
    Object.entries(scores).forEach(([cat, score]) => {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = cat as keyof typeof CATEGORIES_DATA;
      }
    });

    const categoryData = CATEGORIES_DATA[bestCategory];
    const newBank: {name: string, subject: string}[] = [];
    
    // Generate constant bank of 10 pairs
    for (let i = 0; i < 10; i++) {
      newBank.push({
        name: categoryData.names[i % categoryData.names.length],
        subject: `${categoryData.subjects[i % categoryData.subjects.length]} [${generateRandomString(12)}]`
      });
    }

    // Set stable states
    setMemoryBank(newBank);
    setBankIndex(0);
    setDetectedCategory(bestCategory);
    setIdentityName(newBank[0].name);
    setSubject(newBank[0].subject);
    setMatchedKeywords(categoryData.keywords.filter(kw => plainText.includes(kw.toLowerCase())));
    setCleanHtml(sanitizeHtml(htmlSource));

    // 10 Topic-Based Aliases (Bulk) - Use Vault for Uniqueness
    const newAliases = generateUniqueAliases(10, usedAliases);
    setAliases(newAliases);
    markAliasesAsUsed(newAliases);
  }, [decodeQP, generateRandomString, sanitizeHtml, usedAliases, generateUniqueAliases, markAliasesAsUsed]);

  const rotateIdentity = useCallback(() => {
    if (memoryBank.length === 0) return;
    setBankIndex(prev => {
      const nextIndex = (prev + 1) % memoryBank.length;
      setIdentityName(memoryBank[nextIndex].name);
      setSubject(memoryBank[nextIndex].subject);
      
      // Regenerate unique aliases on rotation to ensure continuous uniqueness
      const newAliases = generateUniqueAliases(10, usedAliases);
      setAliases(newAliases);
      markAliasesAsUsed(newAliases);
      
      return nextIndex;
    });
  }, [memoryBank, usedAliases, generateUniqueAliases, markAliasesAsUsed]);

  useEffect(() => {
    if (htmlInput.trim()) {
      analyzeContextAndGenerateBank(htmlInput);
    }
  }, [htmlInput, analyzeContextAndGenerateBank]);

  useEffect(() => {
    // Initial bank for empty state
    analyzeContextAndGenerateBank('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Tab 1: DNS/IP Parser Logic ---
  const processData = useCallback(() => {
    setOutputs({ serverIds: '', ips: '', domains: '', rdns: '', ispMapping: '' });
    setError(null);
    setIspStatus('');
    
    if (!input.trim()) {
      setError('Please enter some data to process.');
      return;
    }

    const normalizedInput = input.replace(/\s+/g, ' ').trim();
    const coreRegex = /([a-z0-9]+)\s+([a-z0-9.-]+)\s+(\d{1,3}(?:\.\d{1,3}){3})/gi;
    
    const serverIds: string[] = [];
    const domains: string[] = [];
    const ips: string[] = [];
    const rdnsList: string[] = [];

    const matches: any[] = [];
    let match;
    while ((match = coreRegex.exec(normalizedInput)) !== null) {
      matches.push({
        index: match.index,
        lastIndex: coreRegex.lastIndex,
        serverId: match[1],
        domain: match[2],
        ip: match[3]
      });
    }

    if (matches.length === 0) {
      setError('No valid patterns found. Please check your input format.');
      return;
    }

    const commonWords = ['has', 'no', 'is', 'record', 'not', 'found', 'the', 'with', 'at', 'to'];

    matches.forEach((m, i) => {
      const nextMatch = matches[i + 1];
      const endOfSearch = nextMatch ? nextMatch.index : normalizedInput.length;
      const textAfterIp = normalizedInput.substring(m.lastIndex, endOfSearch).trim();
      
      const firstWordAfter = textAfterIp.split(' ')[0];
      const hasDot = firstWordAfter && firstWordAfter.includes('.');
      const isNotCommonWord = firstWordAfter && !commonWords.includes(firstWordAfter.toLowerCase());
      const isValidRdns = hasDot && isNotCommonWord && firstWordAfter.length >= 4;

      serverIds.push(m.serverId || 'N/A');
      domains.push(m.domain || 'N/A');
      ips.push(m.ip);
      rdnsList.push(isValidRdns ? firstWordAfter : 'RDNS NOT ADD');
    });

    setOutputs({
      serverIds: serverIds.join('\n'),
      ips: ips.join('\n'),
      domains: domains.join('\n'),
      rdns: rdnsList.join('\n'),
      ispMapping: ''
    });
  }, [input]);

  const performDataLookup = async (url: string, key: string) => {
    try {
      const res = await globalThis.fetch(url);
      if (!res.ok) return 'FAILED';
      const data = await res.json();
      return data[key] || data.isp || data.isp_name || data.org || data.asn || 'N/A';
    } catch {
      return 'FAILED';
    }
  };

  const runIspValidation = async () => {
    if (!outputs.serverIds || !outputs.ips) {
      setError('Please process some data first.');
      return;
    }

    setIsIspLookupActive(true);
    setError(null);
    setOutputs(prev => ({ ...prev, ispMapping: '' }));

    const ids = outputs.serverIds.split('\n');
    const ips = outputs.ips.split('\n');
    
    const uniqueMapping = new Map<string, string>();
    ids.forEach((id, index) => {
      if (id !== 'N/A' && !uniqueMapping.has(id)) {
        uniqueMapping.set(id, ips[index]);
      }
    });

    const results: string[] = [];
    const total = uniqueMapping.size;
    let current = 0;
    
    try {
      for (const [serverId, ip] of uniqueMapping.entries()) {
        current++;
        setIspStatus(`Checking 3 sources for ${serverId} (${current}/${total})...`);

        const [resA, resB, resC] = await Promise.all([
          performDataLookup(`https://api.iplocation.net/?ip=${ip}`, 'isp'),
          performDataLookup(`https://ipapi.co/${ip}/json/`, 'org'),
          performDataLookup(`https://ip-api.io/api/json/${ip}`, 'organisation')
        ]);

        const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchAB = clean(resA) === clean(resB) && resA !== 'FAILED' && resB !== 'FAILED';
        const matchBC = clean(resB) === clean(resC) && resB !== 'FAILED' && resC !== 'FAILED';
        const matchAC = clean(resA) === clean(resC) && resA !== 'FAILED' && resC !== 'FAILED';
        
        const isVerified = (matchAB && matchBC) ? 'YES' : 'NO';
        let outputLine = `ID: ${serverId} | ISP: ${resA} | Verified: ${isVerified}`;
        
        if (isVerified === 'NO') {
          const diffs = [];
          if (resA !== 'FAILED') diffs.push(`A: ${resA}`);
          if (resB !== 'FAILED') diffs.push(`B: ${resB}`);
          if (resC !== 'FAILED') diffs.push(`C: ${resC}`);
          outputLine += ` [Diff: ${diffs.join(' / ')}]`;
        }

        results.push(outputLine);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setOutputs(prev => ({ ...prev, ispMapping: results.join('\n') }));
      setIspStatus('ISP Lookups Complete.');
    } catch (err) {
      setError('An error occurred while retrieving ISP data.');
    } finally {
      setIsIspLookupActive(false);
    }
  };

  const copyEmailPart = async (text: string, setter: (val: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Shared Utilities
  const copyToClipboard = async (type: OutputType) => {
    const text = outputs[type];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const clearAll = () => {
    if (activeTab === 'parser') {
      setInput('');
      setOutputs({ serverIds: '', ips: '', domains: '', rdns: '', ispMapping: '' });
      setIspStatus('');
    } else if (activeTab === 'email') {
      setHtmlInput('');
      setCleanHtml('');
      setIdentityName('');
      setAliases([]);
      setSubject('');
      setMemoryBank([]);
    } else if (activeTab === 'creative') {
      setCreativeFile(null);
      setCreativeBase64(null);
      setCreativeAnalysis(null);
    } else if (activeTab === 'htmlToImage') {
      setHtmlToImageContent('');
      setGeneratedImageUrl(null);
      setImageSpecs(null);
    } else if (activeTab === 'newsletter') {
      setNewsletterInput('');
      setNewsletterMetadata(null);
    }
    setError(null);
    setCopiedStates({});
  };

  const loadSample = () => {
    if (activeTab === 'parser') {
      setInput('esa89 room.saxheavy.com 195.254.134.46 has no rdns\nsrv102 api.example.net 10.0.0.1 dev.internal.net\nnode55 static.cdn.com 8.8.8.8 edge.google.com\nesa89 backup.saxheavy.com 195.254.134.47\n1.1.1.1');
    } else if (activeTab === 'email') {
      setHtmlInput('Subject: Welcome=0AContent-Type: text/html; charset=3D"utf-8"=0A=0A<div>=0A  <p>Read our <a href=3D"http://news.com">newsletter</a> for updates.</p>=0A  <center>=0A    <a href=3D"http://offer.com"><img src=3D"http://img.com/btn.png"></a>=0A    <p>Click here to unsubscribe</p>=0A  </center>=0A  <img src=3D"track.png" width=3D"1" height=3D"1">=0A</div>');
    } else if (activeTab === 'newsletter') {
      setNewsletterInput(`<!DOCTYPE html><html><body>
        <h1>Stop Back Pain Forever with the 3ymmetric Method</h1>
        <p>Are you tired of constant lower back stiffness? Our researchers found that 89% of office workers suffer from postural fatigue. The 3ymmetric Method is a 5-minute daily routine that resets your spine alignment instantly.</p>
        <p>Get the back relief kit today for just <b>$49</b> (normally $129). This 60% discount expires at midnight!</p>
        <p>Join 12,450 others who are now living pain-free.</p>
        <div style="background:#007bff; color:#fff; padding:15px; text-align:center;">Claim Your Spine Reset Here</div>
      </body></html>`);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      file = (e as React.DragEvent).dataTransfer.files[0];
    }

    if (file && file.type.startsWith('image/')) {
      setCreativeFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        setCreativeBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const analyzeCreative = async () => {
    if (!creativeBase64 || isAnalyzing) return;
    setIsAnalyzing(true);
    setCreativeAnalysis(null);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: creativeFile?.type || "image/png",
                data: creativeBase64,
              },
            },
            {
              text: `You are an expert email marketing strategist specializing in high-conversion lead generation. Your task is to analyze the content of this email body image and generate the most effective "From Name" and "Subject Line" pairs that will maximize open rates and clicks.

Follow this logic step by step:

1. **Extract key elements from the email image**:
   - Primary promise
   - Product name
   - Visual clues
   - Emotional triggers
   - Target audience cues

2. **Identify the core pain point and desired outcome**:
   - Pain: what is the problem being solved?
   - Outcome: what is the transformation?

3. **Generate 3 categories of From Names**:
   - Authority/Medical
   - Empathy/Community
   - Curiosity/Brand
   - Avoid generic terms like "Newsletter" or "Update"

4. **Generate 5 unique subject lines** that are:
   - Specific to the pain/activity seen in the image
   - Curiosity-driven or benefit-driven or pain-flipping
   - Short (under 50 characters recommended)
   - Mimic human conversation ("one thing before your coffee")

5. **Select the best 3 pairs** based on:
   - Relevance to image (200% match)
   - Open rate potential (psychological triggers)
   - Uniqueness

Deliver the result in STRICT JSON format according to this schema:
{
  "niche": "Primary Product/Service",
  "vibe": "Visual Vibe",
  "emotion": "Target Emotion",
  "analysis": {
    "pain": "Core pain point",
    "outcome": "Desired outcome"
  },
  "topRecommendation": {
    "fromName": "string",
    "subjectLine": "string",
    "explanation": "string"
  },
  "runnerUp": {
    "fromName": "string",
    "subjectLine": "string"
  },
  "alternative": {
    "fromName": "string",
    "subjectLine": "string"
  },
  "rawOptions": {
    "fromNames": ["list of 3 category-based from names"],
    "subjectLines": ["list of 5 unique subject lines"]
  }
}

Explicitly avoid spammy words ('free', 'urgent', 'cash') or generic templates.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              niche: { type: Type.STRING },
              vibe: { type: Type.STRING },
              emotion: { type: Type.STRING },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  pain: { type: Type.STRING },
                  outcome: { type: Type.STRING }
                }
              },
              topRecommendation: {
                type: Type.OBJECT,
                properties: {
                  fromName: { type: Type.STRING },
                  subjectLine: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              },
              runnerUp: {
                type: Type.OBJECT,
                properties: {
                  fromName: { type: Type.STRING },
                  subjectLine: { type: Type.STRING }
                }
              },
              alternative: {
                type: Type.OBJECT,
                properties: {
                  fromName: { type: Type.STRING },
                  subjectLine: { type: Type.STRING }
                }
              },
              rawOptions: {
                type: Type.OBJECT,
                properties: {
                  fromNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                  subjectLines: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            required: ["niche", "vibe", "emotion", "analysis", "topRecommendation", "runnerUp", "alternative", "rawOptions"],
          },
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        setCreativeAnalysis(result);
      }
    } catch (err) {
      console.error("Creative analysis failed:", err);
      setError("Analysis failed. Please check your connection or try another image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboardCreative = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCreativeCopyStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCreativeCopyStates(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleHtmlFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setHtmlToImageContent(event.target?.result?.toString() || '');
      };
      reader.readAsText(file);
    }
  }, []);

  const generateNewsletterMetadata = async () => {
    if (!newsletterInput || isAnalyzingNewsletter) return;
    setIsAnalyzingNewsletter(true);
    setNewsletterMetadata(null);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      // Strip HTML for the prompt to save tokens (but the prompt asks the AI to handle extraction)
      const cleanText = newsletterInput.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: `Role: expert Email Marketing Strategist and deliverability specialist. Analyze the following newsletter content.

CONTENT:
${cleanText.substring(0, 5000)}

TASK 1: Core Entity Extraction
Identify:
1. The Hook: Primary headline or first bold statement.
2. The Promise: Main benefit the reader gets.
3. Numerical Anchors: List of numbers, percentages, or dollar amounts mentioned.
4. The CTA/Offer: Specific discounts, products, or secrets mentioned.
5. Brand Identity: Name of the sender or the mascot/topic.

TASK 2: Generate 10 "Lethal" From Names
- Structure: [Brand/Topic] + [Safe Suffix]
- Suffixes: Insider, Report, Daily, Tips, Relief, Updates, Bulletin, Kitchen, Method, Hack, Weekend, Charts.
- Constraints: No ALL CAPS, no special characters, no exclamation marks. Max 3 words.

TASK 3: Generate 10 "High-Open" Subject Lines
- Templates: Curiosity Question, Hidden Secret, Authority Hook, Specificity/Numbers, Pain-Killer, Contrast.
- Constraints: No "Free", "Act Now", "100%", "Guaranteed", "$$$". 5-12 words (~60 characters). Sentence case or lowercase. 100% supported by text.

Deliver the result in STRTCT JSON format according to this schema:
{
  "hook": string,
  "promise": string,
  "anchors": string[],
  "cta": string,
  "brand": string,
  "fromNames": string[],
  "subjectLines": string[]
}`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hook: { type: Type.STRING },
              promise: { type: Type.STRING },
              anchors: { type: Type.ARRAY, items: { type: Type.STRING } },
              cta: { type: Type.STRING },
              brand: { type: Type.STRING },
              fromNames: { type: Type.ARRAY, items: { type: Type.STRING } },
              subjectLines: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["hook", "promise", "anchors", "cta", "brand", "fromNames", "subjectLines"],
          },
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        setNewsletterMetadata(result);
      }
    } catch (err) {
      console.error("Newsletter metadata generation failed:", err);
      setError("AI analysis failed. Please try again with different content.");
    } finally {
      setIsAnalyzingNewsletter(false);
    }
  };

  const copyToClipboardNewsletter = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNewsletterCopyStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setNewsletterCopyStates(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const convertHtmlToImage = async (format: 'png' | 'jpeg') => {
    if (!htmlToImageContent || isGeneratingImage) return;
    
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setImageSpecs(null);
    setError(null);

    // Save scroll position
    const scrollPos = window.pageYOffset;

    try {
      // API call to our high-fidelity Puppeteer engine
      const response = await fetch('/api/render-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlToImageContent,
          format: format
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server failed to render image');
      }

      const blob = await response.blob();
      const dataUrl = URL.createObjectURL(blob);
      setGeneratedImageUrl(dataUrl);

      // Specs calculation
      const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
      setImageSpecs({ 
        resolution: 'Ultra Resolution (4x)', 
        size: `${sizeInMB} MB` 
      });

    } catch (err: any) {
      console.error('Image generation failed:', err);
      setError(err.message || 'Cloning failed. Detailed error logged to console.');
    } finally {
      setIsGeneratingImage(false);
      // Restore scroll if needed
      window.scrollTo(0, scrollPos);
    }
  };

  const downloadGeneratedImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `newsletter-ghost-${new Date().getTime()}.${generatedImageUrl.split(';')[0].split('/')[1]}`;
    link.click();
  };

  const analyzeMixMaster = async () => {
    if (!mixMasterInputA || !mixMasterInputB || !mixMasterInputC || !revenueInput) {
      setError("Campaign Table (A), Mixing Panel (B), Volume Bar (C), and Revenue are all required.");
      return;
    }

    setIsAnalyzingMix(true);
    setMixMasterResult(null);
    setError(null);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const parts = [
        { inlineData: { mimeType: "image/png", data: mixMasterInputA.split(',')[1] } },
        { inlineData: { mimeType: "image/png", data: mixMasterInputB.split(',')[1] } },
        { inlineData: { mimeType: "image/png", data: mixMasterInputC.split(',')[1] } }
      ];

      const prompt = `System Instruction: Phase 6 – Performance Tracker (Logic Fix v2.0)
Role: You are a High-Precision Data Extraction Engine. You analyze three pasted screenshots to generate a single, 100% accurate performance row.

 Revenue Context: The user reported a revenue of ${revenueInput}.

### 1. SPECIFIC EXTRACTION HIERARCHY
Screenshot 1: The Campaign Table
- Offer ID: Look ONLY at the column labeled "Offer ID" or similar specific ID column. Do not extract numbers from the name string.
- Category: Look ONLY at the column explicitly stating the vertical (e.g., "Survey").
- Offer Name: Extract the full red/bold string/identifier.

Screenshot 2: The Mixing Panel
- ISP: Locate the ISP dropdown value.
- List Name: Locate the Mixing List dropdown value.
- Date Range: Extract the FROM and TO dates.
- Data Type (CRITICAL): Look at the "New Active Data" table at the bottom. Identify which column has GREEN background cells.
  - Map Ops to "Open"
  - Map Uns to "Unsub"
  - Map Clk to "Click"
  - Combinations allowed: e.g., "Open | Click" if both columns are green.

Screenshot 3: The Volume/Execution Bar
- Length: Find the number inside or next to the green progress bar (e.g., 1270771).

### 2. REFINED NORMALIZATION LOGIC
- ID Precision: Valid ID extraction.
- Volume Math: 
  - If >= 1,000,000 -> divide by 1,000,000 and append "M" (e.g., 1.27M).
  - If < 1,000,000 -> divide by 1,000 and append "K" (e.g., 740K).
- Date Formatting: Convert range to shorthand (e.g., 2026-01-01 to 2026-04-29 -> 1 => 4 / 2026).
- Geo Extraction: Last two characters of Offer Name (e.g., "US").
- Performance Score: Calculate rev / (length_numeric / 1000).

Deliver ONLY the Markdown table row inside a "markdownRow" field, plus the structured JSON fields.

JSON Schema:
{
  "offerName": "string",
  "offerId": "string",
  "listName": "string",
  "length": "string",
  "listDate": "string",
  "status": "string",
  "category": "string",
  "dataType": "string",
  "geo": "string",
  "rev": "string",
  "revK": "string",
  "markdownRow": "| Offer Name | Offer ID | list name | length | list date | Status | Category | Data Type | Geo | rev | rev/K |\\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\\n| ... |"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [...parts, { text: prompt }],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              offerName: { type: Type.STRING },
              offerId: { type: Type.STRING },
              listName: { type: Type.STRING },
              length: { type: Type.STRING },
              listDate: { type: Type.STRING },
              status: { type: Type.STRING },
              category: { type: Type.STRING },
              dataType: { type: Type.STRING },
              geo: { type: Type.STRING },
              rev: { type: Type.STRING },
              revK: { type: Type.STRING },
              markdownRow: { type: Type.STRING }
            },
            required: ["offerName", "offerId", "listName", "length", "listDate", "status", "category", "dataType", "geo", "rev", "revK", "markdownRow"]
          }
        }
      });

      if (response.text) {
         const result = JSON.parse(response.text);
         setMixMasterResult(result);

         // AUTO-SYNC BRIDGE TO LEDGER
         if (user) {
            const offerIdVal = result.offerId || "UNKNOWN_ID";
            const offerNameVal = result.offerName || "UNKNOWN_OFFER";
            const targetMixVal = result.listName || "UNKNOWN_TARGET";
            const sourceDataVal = result.status || "EXTRACTED_SOURCE"; // Mapping status/source if applicable
            const listDateRangeVal = result.listDate || "N/A";
            const dataTypeVal = result.dataType || "None";
            const categoryVal = result.category || "GENERAL";
            
            // Clean length
            let lengthVal = 0;
            if (typeof result.length === 'string') {
              const cleaned = result.length.replace(/[^0-9.KkMm]/g, '');
              if (cleaned.toLowerCase().includes('m')) {
                lengthVal = parseFloat(cleaned) * 1000000;
              } else if (cleaned.toLowerCase().includes('k')) {
                lengthVal = parseFloat(cleaned) * 1000;
              } else {
                lengthVal = parseInt(cleaned) || 0;
              }
            }

            // Sync Key: Offer ID + Target List
            const syncKey = `${offerIdVal}_${targetMixVal}`;
            const now = Date.now();
            if (lastSyncRef[syncKey] && (now - lastSyncRef[syncKey]) < 60000) {
               toast.error("Duplicate Guard: Sync Aborted. Record recently added.");
            } else {
               setIsSyncing(true);
               try {
                 await syncLedgerRow({
                   offerId: offerIdVal,
                   offerName: offerNameVal,
                   sourceData: sourceDataVal,
                   targetMix: targetMixVal,
                   listDateRange: listDateRangeVal,
                   dataType: dataTypeVal,
                   category: categoryVal,
                   revenue: parseFloat(revenueInput) || 0,
                   length: lengthVal,
                   createdDate: new Date().toISOString().split('T')[0]
                 });
                 setLastSyncRef(prev => ({ ...prev, [syncKey]: now }));
                 toast.success("Intelligence Ledger: Sync Success ➔ Data Point Secured");
               } catch (err) {
                 console.error("Ledger Sync Failed:", err);
                 toast.error("Sync Failure: Intelligence Vault Rejected Data");
               } finally {
                 setTimeout(() => setIsSyncing(false), 2000);
               }
            }
         }
      }
    } catch (err) {
      console.error("Mix Master analysis failed:", err);
      setError("Analysis failed. Ensure all three screenshots (Table, Panel, Bar) are provided.");
    } finally {
      setIsAnalyzingMix(false);
    }
  };

  const generateDynamicHeader = useCallback(() => {
    if (!senderEmail || !senderEmail.includes('@')) {
      setHeaderOutput('Please enter a valid sender email.');
      return;
    }

    const domain = senderEmail.split('@')[1];
    const lines: string[] = [];

    if (includeReceived) {
      const envFrom = receivedEnvelopeFrom.trim() || senderEmail;
      lines.push(`Received: from ${receivedIp || '207.171.190.8'} by ${receivedRelay || 'mm-notify-out-103.amazon.com'} for <[*to]>; [*date] (envelope-from <${envFrom}>)`);
    }

    lines.push(`Date: [*date]`);
    lines.push(`From: ${dynamicFromName} <${senderEmail}>`);
    lines.push(`Subject: ${dynamicSubject}`);
    lines.push(`To: <[*to]>`);
    lines.push(`Message-ID: <[RandomL/10].[RandomL/20]@${domain}>`);

    if (includeReplyTo) {
      lines.push(`Reply-To: <${senderEmail}>`);
    }

    if (includeBoundary) {
      lines.push(`Content-Type: multipart/alternative; boundary="${boundaryValue || '----Boundary_30129'}"`);
    } else {
      lines.push(`Content-Type: text/html; charset=utf-8`);
    }

    lines.push(`MIME-Version: 1.0`);

    if (includeListUnsubscribeEmail) {
      lines.push(`List-Unsubscribe: <mailto:unsubscribe-[RandomN/10]@${domain}?subject=Unsubscribe>`);
    }
    if (includeListUnsubscribePost) {
      lines.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
    }

    customHeaders.forEach(ch => {
      if (ch.key.trim() && ch.value.trim()) {
        lines.push(`${ch.key.trim()}: ${ch.value.trim()}`);
      }
    });

    setHeaderOutput(lines.join('\n'));
  }, [
    senderEmail,
    dynamicFromName,
    dynamicSubject,
    includeReplyTo,
    includeListUnsubscribeEmail,
    includeListUnsubscribePost,
    includeBoundary,
    boundaryValue,
    includeReceived,
    receivedIp,
    receivedRelay,
    receivedEnvelopeFrom,
    customHeaders
  ]);

  useEffect(() => {
    if (activeTab === 'dynamicHeader') {
      generateDynamicHeader();
    }
  }, [activeTab, generateDynamicHeader]);
;

  const handlePasteImage = (e: React.ClipboardEvent, setter: (val: string) => void) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setter(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const { entries, loading, user, addOrUpdateEntry: syncLedgerRow, updateEntryField, deleteEntry, deleteEntries } = useLedger();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (activeTab !== 'ledger' || !selectedRowId) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
              await updateEntryField(selectedRowId, 'creativeImage', base64);
              toast.success("Intelligence Vault: Creative Image Attached to Selected Row");
            } catch (err) {
              console.error("Creative attachment failed:", err);
              toast.error("Attachment Failure: Cryptographic Buffer Denied Write");
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeTab, selectedRowId, updateEntryField]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Identity Verified: Intelligence Vault Access Granted");
    } catch (e) {
      console.error(e);
      toast.error("Authentication Failure: Handshake Aborted");
    }
  };

  const LedgerView = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-8 bg-[#141414] text-[#E4E3E0] shadow-2xl">
           <ShieldCheck size={80} className="text-blue-400 opacity-80" />
           <div className="space-y-2">
            <h2 className="font-serif italic text-4xl">Personnel Authentication Required</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">Intelligence Ledger requires a secure session</p>
           </div>
           <button 
             onClick={handleGoogleLogin}
             className="px-10 py-4 bg-white text-[#141414] font-mono uppercase tracking-widest font-bold hover:bg-[#E4E3E0] transition-all flex items-center gap-3 active:scale-95"
           >
             <Globe size={18} />
             Verify Google Identity
           </button>
        </div>
      );
    }

    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#141414] pb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <History size={24} className="text-[#141414]" />
                <h2 className="font-serif italic text-3xl">Persistent Campaign Ledger</h2>
              </div>
              <button 
                onClick={async () => {
                  const id = await syncLedgerRow({
                    offerId: "MANUAL-" + Math.floor(Math.random() * 9000 + 1000),
                    offerName: "[NEW CAMPAIGN]",
                    sourceData: "MANUAL_ENTRY",
                    targetMix: "TBD_TARGET",
                    listDateRange: format(new Date(), 'MM/yyyy'),
                    dataType: "Open",
                    category: "GENERAL",
                    revenue: 0,
                    length: 0,
                    createdDate: new Date().toISOString().split('T')[0]
                  });
                  if (id) {
                    setSelectedRowId(id);
                  }
                }}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-all rounded shadow-md"
              >
                <Plus size={14} />
                Add Manual Row
              </button>
            </div>
            <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest opacity-60">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00FF00]" />
                Winner
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF4B4B]" />
                Blacklisted (7d)
              </span>
            </div>
          </div>
          
          <LedgerTable 
            entries={entries} 
            onUpdate={updateEntryField} 
            onDelete={deleteEntry} 
            onDeleteMultiple={deleteEntries}
            selectedRowId={selectedRowId}
            onSelectRow={setSelectedRowId}
          />
        </section>

        <section className="space-y-6 pt-12 border-t-2 border-[#141414] border-dashed">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-[#141414]" />
            <h2 className="font-serif italic text-3xl">Sheet Import & Bulk Sync</h2>
          </div>
          <SheetImporter 
            onCommit={async (items) => {
              const promises = items.map(item => syncLedgerRow(item));
              await Promise.all(promises);
              toast.success(`${items.length} records synchronized to vault`);
            }} 
          />
        </section>
      </div>
    );
  };

  const OutputBox = ({ type, label, icon: Icon, placeholder, className = "" }: { type: OutputType, label: string, icon: any, placeholder: string, className?: string }) => (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-end">
        <label className="font-serif italic text-[10px] opacity-50 uppercase tracking-wider flex items-center gap-1.5">
          <Icon size={12} />
          {label}
        </label>
        <button
          onClick={() => copyToClipboard(type)}
          disabled={!outputs[type]}
          className={`text-[10px] font-mono uppercase px-2 py-0.5 border border-[#141414] transition-all flex items-center gap-1.5 ${
            !outputs[type] 
              ? 'opacity-20 cursor-not-allowed' 
              : copiedStates[type] 
                ? 'bg-green-600 text-white border-green-600' 
                : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
          }`}
        >
          {copiedStates[type] ? <Check size={10} /> : <ClipboardCopy size={10} />}
          {copiedStates[type] ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea
        readOnly
        className="w-full h-[180px] bg-white bg-opacity-30 border border-[#141414] p-3 font-mono text-xs focus:outline-none resize-none transition-all cursor-default"
        placeholder={placeholder}
        value={outputs[type]}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#141414',
          color: '#E4E3E0',
          fontFamily: 'monospace',
          fontSize: '10px',
          textTransform: 'uppercase',
          borderRadius: '0',
          border: '1px solid #E4E3E0'
        }
      }} />
      {/* Navigation Tabs */}
      <nav className="border-b border-[#141414] flex justify-center bg-white sticky top-0 z-40 shadow-sm">
        <div className="flex gap-4 md:gap-8 px-6">
          <button
            onClick={() => setActiveTab('parser')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'parser' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 1: DNS/IP Parser & Reputation Engine (v4.0)
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'email' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 2: Email Sanitizer
          </button>
          <button
            onClick={() => setActiveTab('creative')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'creative' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 3: Creative Analysis
          </button>
          <button
            onClick={() => setActiveTab('htmlToImage')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'htmlToImage' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 4: HTML To Image
          </button>
          <button
            onClick={() => setActiveTab('newsletter')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'newsletter' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 5: Metadata Engine
          </button>
          <button
            onClick={() => setActiveTab('mixmaster')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'mixmaster' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 6
          </button>
          <button
            onClick={() => setActiveTab('dynamicHeader')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'dynamicHeader' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 7
          </button>
          <button
            onClick={() => setActiveTab('commander')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'commander' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 8
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'ledger' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 9: Ledger
          </button>
          <button
            onClick={() => setActiveTab('yahooSimulator')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'yahooSimulator' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 10
          </button>
          <button
            onClick={() => setActiveTab('ipOracle')}
            className={`py-4 px-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${
              activeTab === 'ipOracle' ? 'border-[#141414] opacity-100 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
          >
            Phase 11: IP Oracle
          </button>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white bg-opacity-50">
        <div>
          <h1 className="font-serif italic text-2xl tracking-tight leading-none">
            {activeTab === 'parser' ? 'Phase 1: DNS/IP Parser & Reputation Engine (v4.0)' : activeTab === 'email' ? 'Email Header Studio' : activeTab === 'creative' ? 'Identity Context Engine' : activeTab === 'htmlToImage' ? 'Ghost Image Generator' : activeTab === 'mixmaster' ? 'Mix Master Tracker' : activeTab === 'dynamicHeader' ? 'Dynamic Header Architect' : activeTab === 'commander' ? 'Operations Commander' : activeTab === 'ledger' ? 'Intelligence Ledger' : activeTab === 'yahooSimulator' ? 'Yahoo Mail Filter Simulator' : activeTab === 'ipOracle' ? 'Phase 11: Advanced IP Oracle & Threat Matrix' : 'Newsletter Metadata Engine'}
          </h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-2">
            {activeTab === 'parser' ? 'Reputation Scanner & DNS Validator' : activeTab === 'email' ? 'Inbox Testing Assistant' : activeTab === 'creative' ? 'Creative Analysis & Identity Engine' : activeTab === 'htmlToImage' ? 'High-Fidelity HTML Clone' : activeTab === 'mixmaster' ? 'Campaign Performance Scaling' : activeTab === 'dynamicHeader' ? 'DMARC Aligned Header Engine' : activeTab === 'commander' ? 'Workflow Technical Compliance' : activeTab === 'ledger' ? 'Data Vault & Sheet Importer' : activeTab === 'yahooSimulator' ? 'Yahoo 2026 Inbox AI Refiner' : activeTab === 'ipOracle' ? 'Mass IP Reputation Audit' : 'Hook-Driven Deliverability Suite'}
          </p>
        </div>
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={loadSample}
            title="Load Sample Data"
            className="text-[10px] md:text-xs font-mono uppercase border border-[#141414] px-2 md:px-3 py-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2"
          >
            <Info size={14} />
            <span className="hidden md:inline">Sample Data</span>
          </button>
          <button 
            onClick={clearAll}
            title="Clear All Fields"
            className="text-[10px] md:text-xs font-mono uppercase border border-[#141414] px-2 md:px-3 py-1 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} />
            <span className="hidden md:inline">Clear</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'parser' && (
            <motion.div 
              key="parser"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-5 flex flex-col gap-4">
                <div className="flex justify-between items-end">
                  <label className="font-serif italic text-sm opacity-50 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} />
                    Input: Squashed Text
                  </label>
                  <span className="font-mono text-[10px] opacity-40">PASTE MESSY DATA HERE</span>
                </div>
                
                <div className="relative group">
                  <textarea
                    className="w-full h-[400px] bg-transparent border border-[#141414] p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] resize-none transition-all placeholder:opacity-30"
                    placeholder="Example: esa89room.saxheavy.com195.254.134.46room.blcclimb.us.com"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-4 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] font-mono bg-[#141414] text-[#E4E3E0] px-2 py-1">EDITING</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={processData}
                    className="bg-[#141414] text-[#E4E3E0] py-4 font-mono uppercase tracking-widest hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <Play size={18} fill="currentColor" />
                    Process Data
                  </button>
                  <button
                    onClick={runIspValidation}
                    disabled={!outputs.serverIds || isIspLookupActive}
                    className={`py-4 font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-[#141414] ${
                      !outputs.serverIds || isIspLookupActive
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                    }`}
                  >
                    {isIspLookupActive ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    <span className="hidden sm:inline">{isIspLookupActive ? 'Loading...' : 'Lookup ISPs'}</span>
                    <span className="sm:hidden">{isIspLookupActive ? '...' : 'ISP'}</span>
                  </button>
                </div>

                {ispStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#141414] text-[#E4E3E0] p-3 font-mono text-[10px] uppercase tracking-widest flex items-center gap-3"
                  >
                    {isIspLookupActive && <Loader2 size={12} className="animate-spin" />}
                    {ispStatus}
                  </motion.div>
                )}

                <div className="mt-4 pt-4 border-t border-[#141414] border-opacity-10">
                  <VolumeNormalizer />
                </div>
              </section>

              <section className="lg:col-span-7 flex flex-col gap-8 relative">
                <div className="flex justify-between items-end">
                  <label className="font-serif italic text-sm opacity-50 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle size={16} />
                    Forensic Infrastructure Audit
                  </label>
                  <span className="font-mono text-[10px] opacity-40">EXTRACTED ARTIFACTS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <OutputBox type="serverIds" label="Server IDs" icon={Server} placeholder="IDs appear here..." />
                  <OutputBox type="ips" label="IP Addresses" icon={Hash} placeholder="IPs appear here..." />
                  <OutputBox type="domains" label="Domains" icon={Globe} placeholder="Domains appear here..." />
                  <OutputBox type="rdns" label="RDNS" icon={Network} placeholder="RDNS appear here..." />
                  <OutputBox 
                    type="ispMapping" 
                    label="ISP Mapping (Triple-Check)" 
                    icon={ShieldCheck} 
                    placeholder="Verified ISP data appears here..." 
                    className="sm:col-span-2"
                  />
                </div>

                <div className="pt-10 mt-6 border-t border-[#141414] border-opacity-10">
                  <ReputationMatrix 
                    ips={outputs.ips ? outputs.ips.split('\n').filter(i => i.trim()) : []}
                    domains={outputs.domains ? outputs.domains.split('\n').filter(d => d.trim()) : []}
                  />
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'email' && (
            <motion.div 
              key="email"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-7 flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="font-serif italic text-sm opacity-50 uppercase tracking-wider flex items-center gap-2">
                      <Code size={16} />
                      HTML Email Sanitizer
                    </label>
                    <span className="font-mono text-[10px] opacity-40 uppercase">Neutralizes Links & Pixels</span>
                  </div>

                  {/* Tags to Remove Selection Panel */}
                  <div className="bg-[#242424] p-4 rounded-sm border border-[#333] shadow-lg">
                    <div className="flex items-center gap-2 mb-3 border-b border-[#444] pb-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                      <span className="text-[#ccc] text-[11px] font-bold tracking-tight">Tags to Remove (Click to Select/Deselect)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {availableRemovalTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTagRemoval(tag)}
                          className={`
                            min-w-[50px] px-2 py-0.5 font-mono text-[10px] border transition-all duration-150
                            ${tagsToRemove.includes(tag) 
                              ? 'bg-[#1a3a5a] text-[#a0c0ff] border-[#2a5a8a] shadow-[inset_0_0_10px_rgba(30,144,255,0.2)]' 
                              : 'bg-[#333] text-[#999] border-[#444] hover:bg-[#3a3a3a] hover:text-[#bbb]'}
                          `}
                        >
                          &lt;{tag}&gt;
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#444] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-[#666] font-mono italic">Click to select tags for extraction</p>
                        {tagsToRemove.length > 0 && (
                          <span className="bg-blue-900 bg-opacity-30 text-blue-400 text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-tighter rounded-full border border-blue-900">
                            {tagsToRemove.length} selected
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 items-center">
                        <button
                          onClick={() => setRemoveAllText(!removeAllText)}
                          className={`
                            flex items-center gap-2 px-3 py-1 border transition-all text-[9px] font-bold uppercase tracking-wider
                            ${removeAllText 
                              ? 'bg-red-900 border-red-500 text-red-200' 
                              : 'bg-black bg-opacity-20 border-[#444] text-[#888] hover:border-red-900/50 hover:text-red-400'}
                          `}
                        >
                          <Zap size={10} className={removeAllText ? 'animate-pulse' : ''} />
                          {removeAllText ? 'Wiping All Text...' : 'Wipe All Text'}
                        </button>
                        {tagsToRemove.length > 0 && (
                          <button 
                            onClick={() => setTagsToRemove([])}
                            className="text-[9px] text-red-400 hover:text-red-300 uppercase font-bold tracking-tight"
                          >
                            Reset Tags
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <textarea
                    className="w-full h-[250px] bg-white bg-opacity-40 border border-[#141414] p-4 font-mono text-xs focus:outline-none resize-none"
                    placeholder="Paste raw HTML email code here (Base64 or Quoted-Printable accepted)..."
                    value={htmlInput}
                    onChange={(e) => setHtmlInput(e.target.value)}
                  />
                  
                  {decodeError && (
                    <div className="bg-red-50 text-red-600 border border-red-200 p-2 text-[10px] font-mono flex items-center gap-2">
                      <AlertCircle size={12} />
                      DECODING FAILED - USING RAW TEXT
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        const clean = sanitizeHtml(htmlInput);
                        setCleanHtml(clean);
                        analyzeContextAndGenerateBank(htmlInput);
                      }}
                      className="bg-[#141414] text-[#E4E3E0] py-3 font-mono uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center justify-center gap-3 group"
                    >
                      <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                      Auto-Decode & Sanitize
                    </button>
                    
                    {tagsToRemove.length > 0 && (
                      <button
                        onClick={() => {
                          const clean = sanitizeHtml(htmlInput);
                          setCleanHtml(clean);
                        }}
                        className="bg-blue-600 text-white py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        Apply & Remove Selected Tags ({tagsToRemove.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="font-serif italic text-[10px] opacity-50 uppercase tracking-wider flex items-center gap-1.5">
                      Clean HTML Output
                    </label>
                    <button
                      onClick={() => copyEmailPart(cleanHtml, setEmailCopied)}
                      disabled={!cleanHtml}
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 border border-[#141414] transition-all flex items-center gap-1.5 ${
                        !cleanHtml ? 'opacity-20 cursor-not-allowed' : emailCopied ? 'bg-green-600 text-white' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                      }`}
                    >
                      {emailCopied ? <Check size={10} /> : <ClipboardCopy size={10} />}
                      {emailCopied ? 'Copied' : 'Copy HTML'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    className="w-full h-[200px] bg-white bg-opacity-20 border border-[#141414] p-3 font-mono text-xs"
                    placeholder="Sanitized HTML will appear here..."
                    value={cleanHtml}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-[#141414] border-opacity-10">
                  <div className="flex justify-between items-end">
                    <label className="font-serif italic text-[10px] opacity-50 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye size={12} /> Live HTML Preview
                    </label>
                    <span className="font-mono text-[8px] opacity-30 uppercase">Isolated Sandbox Rendering</span>
                  </div>
                  <div className="w-full h-[400px] bg-white border border-[#141414] overflow-hidden relative shadow-inner">
                    {cleanHtml ? (
                      <iframe
                        title="Clean HTML Preview"
                        srcDoc={cleanHtml}
                        className="w-full h-full border-none"
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-20 bg-[#E4E3E0]/30">
                        <Monitor size={32} className="mb-2" />
                        <span className="font-mono text-[9px] uppercase tracking-widest">Sanitize HTML to see live preview</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#141414] bg-opacity-5 p-3 font-mono text-[9px] leading-tight flex items-start gap-2">
                    <Info size={12} className="shrink-0 mt-0.5 opacity-50" />
                    <span className="opacity-60 italic">Preview is rendered in an isolated sandbox. External tracking elements and interactive script behaviors are suppressed for safety.</span>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-5 flex flex-col gap-6 bg-white bg-opacity-30 p-8 border border-[#141414]">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#141414] border-opacity-10 pb-2">
                    <UserPlus size={20} />
                    <h3 className="font-serif italic text-xl">Identity & Header Suite</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Identity & Header Suite UI */}
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={rotateIdentity}
                      disabled={memoryBank.length === 0}
                      className="w-full bg-white border border-[#141414] py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center justify-center gap-2 group"
                    >
                      <Sparkles size={14} className="group-hover:animate-pulse" />
                      New Identity Set
                    </button>

                    {/* Concept Status Bar - Overhauled UI */}
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={detectedCategory}
                        className="relative overflow-hidden group"
                      >
                        <div className="flex flex-col gap-2 p-4 bg-[#141414] text-[#E4E3E0] border-l-[4px] border-green-500 shadow-xl shadow-black/10">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-40">Contextual Analysis Engine</span>
                              <div className="flex items-center gap-2">
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                                />
                                <h4 className="font-serif italic text-lg leading-none">
                                  {CATEGORIES_DATA[detectedCategory]?.label || 'General Business'}
                                </h4>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">Confidence</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (matchedKeywords.length / 5) * 100)}%` }}
                                    className="h-full bg-green-500"
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-green-400">
                                  {matchedKeywords.length > 0 ? `${Math.min(100, (matchedKeywords.length / 5) * 100).toFixed(0)}%` : 'LOW'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {matchedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                              <span className="font-mono text-[8px] uppercase opacity-30 mr-1 self-center">Triggers:</span>
                              {matchedKeywords.map((kw, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-[9px] font-mono lowercase text-green-200/60">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Decorative Scanline effect */}
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-[200%] w-full animate-scan" style={{ backgroundSize: '100% 4px' }} />
                        </div>
                      </motion.div>

                      {/* From Name Section */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="font-mono text-[9px] uppercase opacity-30">From Name</span>
                          <button
                            onClick={() => copyEmailPart(identityName, setNameCopied)}
                            disabled={!identityName}
                            className={`text-[9px] font-mono uppercase px-2 py-0.5 border border-[#141414] transition-all flex items-center gap-1.5 ${
                              !identityName ? 'opacity-20 cursor-not-allowed' : nameCopied ? 'bg-green-600 text-white border-green-600' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                            }`}
                          >
                            {nameCopied ? <Check size={10} /> : <ClipboardCopy size={10} />}
                            {nameCopied ? 'Copied' : 'COPY FROM NAME'}
                          </button>
                        </div>
                        <div className="bg-white border border-[#141414] p-2 px-3 font-mono text-xs">
                          {identityName || '--'}
                        </div>
                      </div>

                      {/* Sender Email Section */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="font-mono text-[9px] uppercase opacity-30">Sender Email</span>
                          <button
                            onClick={() => copyEmailPart(aliases[bankIndex % aliases.length] || '', setSenderEmailCopied)}
                            disabled={!aliases[0]}
                            className={`text-[9px] font-mono uppercase px-2 py-0.5 border border-[#141414] transition-all flex items-center gap-1.5 ${
                              !aliases[0] ? 'opacity-20 cursor-not-allowed' : senderEmailCopied ? 'bg-green-600 text-white border-green-600' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                            }`}
                          >
                            {senderEmailCopied ? <Check size={10} /> : <ClipboardCopy size={10} />}
                            {senderEmailCopied ? 'Copied' : 'COPY SENDER EMAIL'}
                          </button>
                        </div>
                        <div className="bg-white border border-[#141414] p-2 px-3 font-mono text-xs">
                          {aliases[bankIndex % aliases.length] || '--'}
                        </div>
                      </div>

                      {/* Subject Section */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] uppercase opacity-30">Subject Line</span>
                             <span className="px-1 bg-[#141414] text-[#E4E3E0] text-[8px] font-mono uppercase">Decoy Appended</span>
                          </div>
                          <button
                            onClick={() => copyEmailPart(subject, setSubjectCopied)}
                            disabled={!subject}
                            className={`text-[9px] font-mono uppercase px-2 py-0.5 border border-[#141414] transition-all flex items-center gap-1.5 ${
                              !subject ? 'opacity-20 cursor-not-allowed' : subjectCopied ? 'bg-green-600 text-white border-green-600' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                            }`}
                          >
                            {subjectCopied ? <Check size={10} /> : <ClipboardCopy size={10} />}
                            {subjectCopied ? 'Copied' : 'COPY SUBJECT'}
                          </button>
                        </div>
                        <div className="bg-white border border-[#141414] p-2 px-3 font-mono text-xs">
                          {subject || '--'}
                        </div>
                      </div>
                    </div>

                    {/* 10 Bulk Aliases Box */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-[#141414] border-opacity-10">
                      <div className="flex justify-between items-end">
                        <label className="font-mono text-[10px] uppercase opacity-40">10 Topic-Based Aliases (Bulk)</label>
                        <button
                          onClick={() => copyEmailPart(aliases.map(a => a.split('@')[0]).join('\n'), setAliasesCopied)}
                          disabled={aliases.length === 0}
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 border border-[#141414] transition-all flex items-center gap-1.5 ${
                            aliases.length === 0 ? 'opacity-20 cursor-not-allowed' : aliasesCopied ? 'bg-green-600 text-white border-green-600' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                          }`}
                        >
                          {aliasesCopied ? <Check size={10} /> : <ClipboardCopy size={10} />}
                          {aliasesCopied ? 'Copied All' : 'Copy List'}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={aliases.map(a => a.split('@')[0]).join('\n')}
                        className="w-full bg-white border border-[#141414] p-3 font-mono text-[10px] h-32 scrollbar-hide resize-none focus:outline-none"
                        placeholder="Click 'New Identity' to generate 10 topic-based aliases..."
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={rotateIdentity}
                        disabled={memoryBank.length === 0}
                        className={`w-full py-3 border border-[#141414] font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                          memoryBank.length === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                        }`}
                      >
                        <Play size={14} className={memoryBank.length > 0 ? 'animate-pulse' : ''} />
                        New Identity Set ({bankIndex + 1}/10)
                      </button>
                      <div className="flex justify-between items-center px-1">
                        <span className="font-mono text-[8px] uppercase opacity-30">Vault: {usedAliases.size.toLocaleString()} Secured</span>
                        <button 
                          onClick={() => { if(confirm("DRAIN ALIAS VAULT? This will reset uniqueness tracking.")) { localStorage.removeItem('used_aliases_vault'); setUsedAliases(new Set()); } }}
                          className="font-mono text-[8px] uppercase opacity-20 hover:opacity-100 hover:text-red-600 transition-all"
                        >
                          Drain Vault
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-4 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] leading-relaxed opacity-90 uppercase tracking-tighter">
                  Tip: Clean, neutral From Names (e.g. "Account Services") significantly improve open rates and reduce manual spam flags.
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'creative' && (
            <motion.div 
              key="creative"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex flex-col gap-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upload Section */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="flex justify-between items-end">
                    <label className="font-serif italic text-sm opacity-50 uppercase tracking-wider flex items-center gap-2">
                      <Upload size={16} />
                      Source Creative
                    </label>
                  </div>

                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { setDragActive(false); handleFileUpload(e); }}
                    className={`relative aspect-[4/3] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden ${
                      dragActive ? 'border-[#141414] bg-white/50' : 'border-[#141414]/20 hover:border-[#141414]/40 bg-white/20'
                    }`}
                  >
                    {creativeBase64 ? (
                      <>
                        <img 
                          src={`data:image/png;base64,${creativeBase64}`} 
                          alt="Creative Preview" 
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white font-mono text-[10px] uppercase tracking-widest bg-black px-4 py-2 border border-white/20">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center px-8">
                        <Upload size={32} className="opacity-20" />
                        <p className="font-serif italic text-sm opacity-60">Drag and drop your creative PNG or click to browse</p>
                        <p className="font-mono text-[10px] uppercase opacity-30">Analysis powered by Gemini Vision</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={analyzeCreative}
                    disabled={!creativeBase64 || isAnalyzing}
                    className={`w-full py-4 font-mono uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                      !creativeBase64 || isAnalyzing
                        ? 'bg-[#141414]/5 text-[#141414]/30 cursor-not-allowed'
                        : 'bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90 shadow-xl shadow-black/10'
                    }`}
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                    {isAnalyzing ? 'Scanning Creative...' : 'Synthesize Identity'}
                  </button>
                </div>

                {/* Analysis Result Section */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {!creativeAnalysis ? (
                    <div className="h-full border border-[#141414]/10 bg-white/10 flex flex-col items-center justify-center text-center p-12 opacity-30">
                      <Sparkles size={48} className="mb-4" />
                      <h3 className="font-serif italic text-xl mb-2">Awaiting Context</h3>
                      <p className="font-mono text-[10px] uppercase tracking-widest leading-loose max-w-xs">
                        Upload a creative image to extract behavioral triggers, visual mood, and human-mimicry identity patterns.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-700">
                      {/* High-Level Analysis Context */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#141414] text-[#E4E3E0] p-4 flex flex-col gap-2 shadow-xl border-l-4 border-blue-500">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <Zap size={10} className="text-blue-400" /> Core Pain Point
                          </span>
                          <p className="font-serif italic text-sm leading-tight italic">"{creativeAnalysis.analysis.pain}"</p>
                        </div>
                        <div className="bg-[#141414] text-[#E4E3E0] p-4 flex flex-col gap-2 shadow-xl border-l-4 border-green-500">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <CheckCircle size={10} className="text-green-400" /> Desired Outcome
                          </span>
                          <p className="font-serif italic text-sm leading-tight italic">"{creativeAnalysis.analysis.outcome}"</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-[#141414] p-4 flex flex-col gap-2 shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <Tag size={10} /> Extracted Niche
                          </span>
                          <p className="font-serif italic text-md leading-tight">{creativeAnalysis.niche}</p>
                        </div>
                        <div className="bg-white border border-[#141414] p-4 flex flex-col gap-2 shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <LucideType size={10} /> Visual Vibe
                          </span>
                          <p className="font-serif italic text-md leading-tight uppercase font-bold tracking-tighter">{creativeAnalysis.vibe}</p>
                        </div>
                        <div className="bg-white border border-[#141414] p-4 flex flex-col gap-2 shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <Smile size={10} /> Target Emotion
                          </span>
                          <p className="font-serif italic text-md leading-tight text-blue-600">{creativeAnalysis.emotion}</p>
                        </div>
                      </div>

                      {/* Strategic Recommendation Pairs */}
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2 border-b border-[#141414] pb-2">
                           <Award size={18} className="text-blue-600" />
                           <h3 className="font-serif italic text-xl font-bold">Strategic Recommendations (High-Conversion Pairs)</h3>
                        </div>

                        {/* Top Recommendation */}
                        <div className="bg-white border-2 border-blue-600 p-6 flex flex-col gap-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 font-mono text-[9px] uppercase tracking-widest">Top Pick</div>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[9px] uppercase opacity-40 tracking-widest">Recommendation Explanation</span>
                            <p className="text-sm italic text-[#141414]/80 leading-relaxed font-serif">"{creativeAnalysis.topRecommendation.explanation}"</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="flex flex-col gap-1.5">
                              <span className="font-mono text-[8px] uppercase opacity-40">From Name</span>
                              <div className="flex justify-between items-center bg-[#f8f8f8] p-3 border border-[#eee] group hover:border-blue-600 transition-colors">
                                <span className="font-mono text-xs font-bold uppercase">{creativeAnalysis.topRecommendation.fromName}</span>
                                <button 
                                  onClick={() => copyToClipboardCreative(creativeAnalysis.topRecommendation.fromName, 'top-from')}
                                  className={`p-1.5 transition-all ${creativeCopyStates['top-from'] ? 'text-green-600' : 'opacity-30 hover:opacity-100'}`}
                                >
                                  {creativeCopyStates['top-from'] ? <Check size={14} /> : <ClipboardCopy size={14} />}
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="font-mono text-[8px] uppercase opacity-40">Subject Line</span>
                              <div className="flex justify-between items-center bg-[#f8f8f8] p-3 border border-[#eee] group hover:border-blue-600 transition-colors">
                                <span className="font-mono text-xs italic">"{creativeAnalysis.topRecommendation.subjectLine}"</span>
                                <button 
                                  onClick={() => copyToClipboardCreative(creativeAnalysis.topRecommendation.subjectLine, 'top-sub')}
                                  className={`p-1.5 transition-all ${creativeCopyStates['top-sub'] ? 'text-green-600' : 'opacity-30 hover:opacity-100'}`}
                                >
                                  {creativeCopyStates['top-sub'] ? <Check size={14} /> : <ClipboardCopy size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Runner Up & Alternative */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-white border border-[#141414] p-5 flex flex-col gap-4">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-[#141414]/40">Runner Up Pair</span>
                                <TrendingUp size={14} className="opacity-20" />
                              </div>
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-[8px] uppercase opacity-40">From Name</span>
                                  <div className="flex justify-between items-center bg-[#f8f8f8] p-2 px-3 border border-[#eee]">
                                    <span className="font-mono text-[11px] truncate uppercase">{creativeAnalysis.runnerUp.fromName}</span>
                                    <button 
                                      onClick={() => copyToClipboardCreative(creativeAnalysis.runnerUp.fromName, 'run-from')}
                                      className={`p-1 transition-all ${creativeCopyStates['run-from'] ? 'text-green-600' : 'opacity-30 hover:opacity-100'}`}
                                    >
                                      {creativeCopyStates['run-from'] ? <Check size={12} /> : <ClipboardCopy size={12} />}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-[8px] uppercase opacity-40">Subject Line</span>
                                  <div className="flex justify-between items-center bg-[#f8f8f8] p-2 px-3 border border-[#eee]">
                                    <span className="font-mono text-[11px] truncate italic">"{creativeAnalysis.runnerUp.subjectLine}"</span>
                                    <button 
                                      onClick={() => copyToClipboardCreative(creativeAnalysis.runnerUp.subjectLine, 'run-sub')}
                                      className={`p-1 transition-all ${creativeCopyStates['run-sub'] ? 'text-green-600' : 'opacity-30 hover:opacity-100'}`}
                                    >
                                      {creativeCopyStates['run-sub'] ? <Check size={12} /> : <ClipboardCopy size={12} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                           </div>

                           <div className="bg-white border border-[#141414] p-5 flex flex-col gap-4">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-[#141414]/40">A/B Testing Alt</span>
                                <Repeat size={14} className="opacity-20" />
                              </div>
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-[8px] uppercase opacity-40">From Name</span>
                                  <div className="flex justify-between items-center bg-[#f8f8f8] p-2 px-3 border border-[#eee]">
                                    <span className="font-mono text-[11px] truncate uppercase">{creativeAnalysis.alternative.fromName}</span>
                                    <button 
                                      onClick={() => copyToClipboardCreative(creativeAnalysis.alternative.fromName, 'alt-from')}
                                      className={`p-1 transition-all ${creativeCopyStates['alt-from'] ? 'text-green-600' : 'opacity-30 hover:opacity-100'}`}
                                    >
                                      {creativeCopyStates['alt-from'] ? <Check size={12} /> : <ClipboardCopy size={12} />}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-[8px] uppercase opacity-40">Subject Line</span>
                                  <div className="flex justify-between items-center bg-[#f8f8f8] p-2 px-3 border border-[#eee]">
                                    <span className="font-mono text-[11px] truncate italic">"{creativeAnalysis.alternative.subjectLine}"</span>
                                    <button 
                                      onClick={() => copyToClipboardCreative(creativeAnalysis.alternative.subjectLine, 'alt-sub')}
                                      className={`p-1 transition-all ${creativeCopyStates['alt-sub'] ? 'text-green-600' : 'opacity-30 hover:opacity-100'}`}
                                    >
                                      {creativeCopyStates['alt-sub'] ? <Check size={12} /> : <ClipboardCopy size={12} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Raw Asset Lists */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-[#141414]/10">
                        {/* Column 1: From Names */}
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-[#141414] pb-2">
                            <h3 className="font-serif italic text-md flex items-center gap-2">
                              <UserPlus size={16} /> Asset List: From Names
                            </h3>
                          </div>
                          <div className="flex flex-col gap-2">
                            {creativeAnalysis.rawOptions.fromNames.map((name: string, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-white border border-[#141414]/10 p-2 pl-3 group hover:border-[#141414] transition-all">
                                <span className="font-mono text-xs">{name}</span>
                                <button 
                                  onClick={() => copyToClipboardCreative(name, `from-raw-${i}`)}
                                  className={`p-1.5 transition-all ${creativeCopyStates[`from-raw-${i}`] ? 'text-green-600' : 'opacity-30 group-hover:opacity-100 hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
                                >
                                  {creativeCopyStates[`from-raw-${i}`] ? <Check size={14} /> : <ClipboardCopy size={14} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 2: Subject Lines */}
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-[#141414] pb-2">
                            <h3 className="font-serif italic text-md flex items-center gap-2">
                              <Zap size={16} /> Asset List: Subject Lines
                            </h3>
                          </div>
                          <div className="flex flex-col gap-2">
                            {creativeAnalysis.rawOptions.subjectLines.map((subject: string, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-white border border-[#141414]/10 p-2 pl-3 group hover:border-[#141414] transition-all">
                                <span className="font-mono text-xs">{subject}</span>
                                <button 
                                  onClick={() => copyToClipboardCreative(subject, `sub-raw-${i}`)}
                                  className={`p-1.5 transition-all ${creativeCopyStates[`sub-raw-${i}`] ? 'text-green-600' : 'opacity-30 group-hover:opacity-100 hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
                                >
                                  {creativeCopyStates[`sub-raw-${i}`] ? <Check size={14} /> : <ClipboardCopy size={14} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-[#141414]/70 font-mono text-[9px] leading-relaxed uppercase tracking-widest">
                        Expert Strategist Analysis: All outputs screened against conversion psychology benchmarks. Clickbait sanitized to Information. Banned: Re:, Fwd:, Urgent, All CAPS.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'htmlToImage' && (
            <motion.div 
              key="htmlToImage"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-6 flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="font-serif italic text-sm opacity-50 uppercase tracking-wider flex items-center gap-2">
                      <Code size={16} />
                      HTML Ghost Input
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <Upload size={14} className="opacity-40 group-hover:opacity-100" />
                        <span className="text-[10px] font-mono uppercase opacity-40 group-hover:opacity-100 border-b border-transparent group-hover:border-[#141414]">Upload HTML</span>
                        <input type="file" accept=".html,.txt" onChange={handleHtmlFileLoad} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="w-full h-[350px] bg-white bg-opacity-40 border border-[#141414] p-4 font-mono text-xs focus:outline-none resize-none"
                    placeholder="Paste your newsletter HTML code here. Images will be captured if CORS policy allows..."
                    value={htmlToImageContent}
                    onChange={(e) => setHtmlToImageContent(e.target.value)}
                  />
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      onClick={() => convertHtmlToImage('png')}
                      disabled={!htmlToImageContent || isGeneratingImage}
                      className={`py-4 font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                        !htmlToImageContent || isGeneratingImage 
                          ? 'bg-[#141414]/5 text-[#141414]/30 cursor-not-allowed' 
                          : 'bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90 shadow-lg shadow-black/10'
                      }`}
                    >
                      {isGeneratingImage ? <Loader2 size={18} className="animate-spin" /> : <Maximize2 size={18} />}
                      {isGeneratingImage ? 'Generating Ghost Image...' : 'Convert to PNG'}
                    </button>
                    <button
                      onClick={() => convertHtmlToImage('jpeg')}
                      disabled={!htmlToImageContent || isGeneratingImage}
                      className={`py-4 border border-[#141414] font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                        !htmlToImageContent || isGeneratingImage
                          ? 'opacity-20 cursor-not-allowed'
                          : 'hover:bg-[#141414] hover:text-[#E4E3E0]'
                      }`}
                    >
                      {isGeneratingImage ? <Loader2 size={18} className="animate-spin" /> : <LucideImage size={18} />}
                      {isGeneratingImage ? 'Generating Ghost Image...' : 'Convert to JPG'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-6 flex flex-col gap-4">
                <div className="flex justify-between items-end border-b border-[#141414] pb-2">
                  <h3 className="font-serif italic text-xl flex items-center gap-3 font-bold">
                    <Monitor size={22} /> Image Clone Preview
                  </h3>
                  {imageSpecs && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-top-1">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono uppercase opacity-40">Resolution</span>
                        <span className="text-[10px] font-mono font-bold">{imageSpecs.resolution}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono uppercase opacity-40">File Size</span>
                        <span className={`text-[10px] font-mono font-bold ${parseFloat(imageSpecs.size) > 2 ? 'text-red-500' : 'text-green-600'}`}>
                          {imageSpecs.size}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-white/20 border border-[#141414]/10 overflow-auto max-h-[600px] flex items-start justify-center p-4 relative group min-h-[400px]">
                  {generatedImageUrl ? (
                    <motion.img 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      src={generatedImageUrl} 
                      alt="Newsletter Preview" 
                      className="shadow-2xl shadow-black/20 w-[300px] sm:w-[500px] lg:w-[600px] h-auto object-contain bg-white"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 w-full opacity-20 text-center gap-4">
                      <Layers size={64} strokeWidth={1} />
                      <div className="space-y-1">
                        <p className="font-serif italic text-lg">Awaiting Render</p>
                        <p className="font-mono text-[9px] uppercase tracking-widest">Input HTML and select format to generate preview</p>
                      </div>
                    </div>
                  )}
                </div>

                {generatedImageUrl && (
                  <button
                    onClick={downloadGeneratedImage}
                    className="w-full py-4 bg-green-600 text-white font-mono uppercase tracking-[0.2em] hover:bg-green-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-600/20"
                  >
                    <Download size={18} />
                    Download Optimized Image
                  </button>
                )}

                <div className="bg-[#141414] p-4 text-white/70 font-mono text-[10px] uppercase leading-relaxed tracking-tighter border-l-4 border-green-500 mt-auto">
                  <p>Deliverability Tip: Sending a full-image email ("Ghost Method") bypasses advanced text-based filters but requires a high-quality, high-res render to remain accessible.</p>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'newsletter' && (
            <motion.div 
              key="newsletter"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-12 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <label className="font-serif italic text-sm opacity-50 uppercase tracking-wider flex items-center gap-2">
                      <Code size={16} />
                      Newsletter HTML Source
                    </label>
                    <span className="font-mono text-[10px] opacity-40 uppercase">Extract Hooks & Generate Metadata</span>
                  </div>
                  <textarea
                    className="w-full h-[200px] bg-white bg-opacity-40 border border-[#141414] p-4 font-mono text-xs focus:outline-none resize-none"
                    placeholder="Paste the raw HTML newsletter code here to extract lethal subject lines and from names..."
                    value={newsletterInput}
                    onChange={(e) => setNewsletterInput(e.target.value)}
                  />
                  <button
                    onClick={generateNewsletterMetadata}
                    disabled={!newsletterInput || isAnalyzingNewsletter}
                    className={`bg-[#141414] text-[#E4E3E0] py-4 font-mono uppercase tracking-[0.2em] hover:bg-opacity-90 transition-all flex items-center justify-center gap-3 ${
                      !newsletterInput || isAnalyzingNewsletter ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                  >
                    {isAnalyzingNewsletter ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                    {isAnalyzingNewsletter ? 'Analyzing Deliverability Strategy...' : 'Generate High-Open Metadata'}
                  </button>
                </div>

                {newsletterMetadata && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
                        <Search size={18} />
                        <h3 className="font-serif italic text-lg uppercase tracking-tight">Core Extraction</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5 p-3 bg-white border border-[#141414] shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">The Hook</span>
                          <p className="font-serif italic text-sm leading-tight text-red-700 font-bold">{newsletterMetadata.hook}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3 bg-white border border-[#141414] shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">The Promise</span>
                          <p className="font-sans text-xs leading-relaxed font-semibold">{newsletterMetadata.promise}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3 bg-white border border-[#141414] shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">Numerical Anchors</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {newsletterMetadata.anchors.map((anchor, i) => (
                              <span key={i} className="px-2 py-0.5 bg-[#141414] text-[#E4E3E0] font-mono text-[10px]">{anchor}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3 bg-white border border-[#141414] shadow-sm">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">CTA / Offer</span>
                          <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-blue-800">{newsletterMetadata.cta}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3 bg-[#141414] text-[#E4E3E0]">
                          <span className="font-mono text-[8px] uppercase tracking-widest opacity-40">Brand Identity</span>
                          <p className="font-serif italic text-md leading-tight">{newsletterMetadata.brand}</p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                      <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
                        <UserPlus size={18} />
                        <h3 className="font-serif italic text-lg uppercase tracking-tight">10 lethal From Names</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {newsletterMetadata.fromNames.map((name, i) => (
                          <div key={i} className="flex justify-between items-center bg-white border border-[#141414]/10 p-2 pl-3 group hover:border-[#141414] transition-all">
                            <span className="font-mono text-xs">{name}</span>
                            <button 
                              onClick={() => copyToClipboardNewsletter(name, `news-from-${i}`)}
                              className={`p-1.5 transition-all ${newsletterCopyStates[`news-from-${i}`] ? 'text-green-600' : 'opacity-0 group-hover:opacity-100 hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
                            >
                              {newsletterCopyStates[`news-from-${i}`] ? <Check size={14} /> : <ClipboardCopy size={14} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                      <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
                        <Mail size={18} />
                        <h3 className="font-serif italic text-lg uppercase tracking-tight">10 High-Open Subjects</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {newsletterMetadata.subjectLines.map((sub, i) => (
                          <div key={i} className="flex justify-between items-center bg-white border border-[#141414]/10 p-2 pl-3 group hover:border-[#141414] transition-all">
                            <span className="font-mono text-[10px] leading-tight">{sub}</span>
                            <button 
                              onClick={() => copyToClipboardNewsletter(sub, `news-sub-${i}`)}
                              className={`p-1.5 transition-all shrink-0 ${newsletterCopyStates[`news-sub-${i}`] ? 'text-green-600' : 'opacity-0 group-hover:opacity-100 hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
                            >
                              {newsletterCopyStates[`news-sub-${i}`] ? <Check size={14} /> : <ClipboardCopy size={14} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'dynamicHeader' && (
            <motion.div 
              key="dynamicHeader"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-5 flex flex-col gap-6">
                {/* TECHNICAL SENDER MAPPING CARD */}
                <div className="bg-white border border-[#141414] p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-2 border-b border-[#141414] pb-2">
                    <Mail size={18} />
                    <h3 className="font-serif italic text-xl font-bold uppercase tracking-tight">Technical sender mapping</h3>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest">Sender Email (Primary Variable)</label>
                      <input 
                        type="email" 
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="alias@domain.com"
                        className="w-full bg-[#f8f8f8] border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                      />
                      <p className="text-[8px] font-mono opacity-30 italic">Extracts alias and domain automatically for DMARC alignment.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest">From Name</label>
                      <input 
                        type="text" 
                        value={dynamicFromName}
                        onChange={(e) => setDynamicFromName(e.target.value)}
                        placeholder="Bookstr"
                        className="w-full bg-[#f8f8f8] border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest">Subject</label>
                      <input 
                        type="text" 
                        value={dynamicSubject}
                        onChange={(e) => setDynamicSubject(e.target.value)}
                        placeholder="Your Subject Here"
                        className="w-full bg-[#f8f8f8] border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                      />
                    </div>
                  </div>
                </div>

                {/* HEADER VISIBILITY & OPTIONS */}
                <div className="bg-white border border-[#141414] p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-2 border-b border-[#141414] pb-2">
                    <Settings size={18} className="text-[#141414]" />
                    <h3 className="font-serif italic text-xl font-bold uppercase tracking-tight">Header Toggles & Options</h3>
                  </div>

                  <div className="flex flex-col gap-5 font-mono text-xs">
                    {/* Toggle: Reply-To */}
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                      <input 
                        type="checkbox" 
                        checked={includeReplyTo}
                        onChange={(e) => setIncludeReplyTo(e.target.checked)}
                        className="mt-1 accent-black h-4 w-4 border-gray-300 rounded"
                      />
                      <div>
                        <span className="font-bold uppercase tracking-wide group-hover:text-black">Include Reply-To Header</span>
                        <p className="text-[9px] text-gray-500 leading-normal">Reply-To matching the sender email address.</p>
                      </div>
                    </label>

                    {/* Toggle: List-Unsubscribe Mailto */}
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                      <input 
                        type="checkbox" 
                        checked={includeListUnsubscribeEmail}
                        onChange={(e) => setIncludeListUnsubscribeEmail(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-black border-gray-300 rounded"
                      />
                      <div>
                        <span className="font-bold uppercase tracking-wide group-hover:text-black">Include List-Unsubscribe (Mailto)</span>
                        <p className="text-[9px] text-gray-500 leading-normal">Provides mailto unsubscribe link headers for ISPs.</p>
                      </div>
                    </label>

                    {/* Toggle: List-Unsubscribe Post (One-Click) */}
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                      <input 
                        type="checkbox" 
                        checked={includeListUnsubscribePost}
                        onChange={(e) => setIncludeListUnsubscribePost(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-black border-gray-300 rounded"
                      />
                      <div>
                        <span className="font-bold uppercase tracking-wide group-hover:text-black">Include List-Unsubscribe-Post</span>
                        <p className="text-[9px] text-gray-500 leading-normal">Enables RFC-8058 One-Click unsubscribe headers.</p>
                      </div>
                    </label>

                    {/* Toggle: Custom Boundary / Multipart */}
                    <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                      <label className="flex items-start gap-3 cursor-pointer group select-none">
                        <input 
                          type="checkbox" 
                          checked={includeBoundary}
                          onChange={(e) => setIncludeBoundary(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-black border-gray-300 rounded"
                        />
                        <div>
                          <span className="font-bold uppercase tracking-wide group-hover:text-black">Multipart Boundary Option</span>
                          <p className="text-[9px] text-gray-500 leading-normal">Switches Content-Type to multipart/alternative with boundaries.</p>
                        </div>
                      </label>
                      {includeBoundary && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pl-7 mt-1"
                        >
                          <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest block mb-1">Boundary Identifier</label>
                          <input 
                            type="text" 
                            value={boundaryValue}
                            onChange={(e) => setBoundaryValue(e.target.value)}
                            className="w-full bg-[#f8f8f8] border border-[#141414] p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Toggle: Received Header Line */}
                    <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                      <label className="flex items-start gap-3 cursor-pointer group select-none">
                        <input 
                          type="checkbox" 
                          checked={includeReceived}
                          onChange={(e) => setIncludeReceived(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-black border-gray-300 rounded"
                        />
                        <div>
                          <span className="font-bold uppercase tracking-wide group-hover:text-black">Inject Received Header Line</span>
                          <p className="text-[9px] text-gray-500 leading-normal">Adds a simulated Received hops pathway header.</p>
                        </div>
                      </label>
                      {includeReceived && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pl-7 mt-1 space-y-2"
                        >
                          <div>
                            <label className="font-mono text-[8px] uppercase opacity-50 tracking-widest block mb-0.5">Origin Relay IP</label>
                            <input 
                              type="text" 
                              value={receivedIp}
                              onChange={(e) => setReceivedIp(e.target.value)}
                              placeholder="207.171.190.8"
                              className="w-full bg-[#f8f8f8] border border-[#141414] p-2 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[8px] uppercase opacity-50 tracking-widest block mb-0.5">Mailing / Relay Server</label>
                            <input 
                              type="text" 
                              value={receivedRelay}
                              onChange={(e) => setReceivedRelay(e.target.value)}
                              placeholder="mm-notify-out-103.amazon.com"
                              className="w-full bg-[#f8f8f8] border border-[#141414] p-2 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[8px] uppercase opacity-50 tracking-widest block mb-0.5">Envelope-From Return Path</label>
                            <input 
                              type="text" 
                              value={receivedEnvelopeFrom}
                              onChange={(e) => setReceivedEnvelopeFrom(e.target.value)}
                              placeholder="If empty, matches Sender Email"
                              className="w-full bg-[#f8f8f8] border border-[#141414] p-2 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CUSTOM USER DEFINED HEADERS BLOCK */}
                <div className="bg-white border border-[#141414] p-8 flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <div className="flex items-center gap-2">
                      <Grid size={18} className="text-[#141414]" />
                      <h3 className="font-serif italic text-xl font-bold uppercase tracking-tight">Custom Headers</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const newId = Math.random().toString(36).substring(2, 9);
                        setCustomHeaders(prev => [...prev, { id: newId, key: '', value: '' }]);
                      }}
                      className="text-[9px] uppercase tracking-wider bg-[#141414] text-[#E4E3E0] px-3 py-1 font-bold hover:bg-neutral-800 transition-all font-mono"
                    >
                      + Add Row
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 font-mono">
                    {customHeaders.length === 0 ? (
                      <p className="text-[10px] uppercase tracking-wide opacity-30 text-center py-2">No Custom Header Lines Configured</p>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {customHeaders.map((ch) => (
                          <div key={ch.id} className="flex gap-2 items-center">
                            <input 
                              type="text"
                              value={ch.key}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomHeaders(prev => prev.map(item => item.id === ch.id ? { ...item, key: val } : item));
                              }}
                              placeholder="e.g. X-Priority"
                              className="w-1/3 bg-[#f8f8f8] border border-[#141414] p-1.5 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                            />
                            <span className="opacity-50">:</span>
                            <input 
                              type="text"
                              value={ch.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomHeaders(prev => prev.map(item => item.id === ch.id ? { ...item, value: val } : item));
                              }}
                              placeholder="1 (Highest)"
                              className="flex-1 bg-[#f8f8f8] border border-[#141414] p-1.5 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                            />
                            <button 
                              onClick={() => {
                                setCustomHeaders(prev => prev.filter(item => item.id !== ch.id));
                              }}
                              className="p-1 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-600/20 text-gray-400 rounded transition-all shrink-0"
                              title="Delete Header Line"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COMPLIANCE HELP CARD */}
                <div className="bg-blue-50 border border-blue-200 p-4 flex gap-3 items-start">
                  <Info size={16} className="text-blue-500 mt-0.5" />
                  <p className="text-[9px] font-mono leading-tight text-blue-700 uppercase tracking-wider">
                    The system automatically synchronizes the Message-ID and List-Unsubscribe domains with the Sender domain for maximum reputation trust. Keep settings aligned with your ISP sending compliance limits.
                  </p>
                </div>
              </section>

              <section className="lg:col-span-7">
                <div className="bg-[#141414] text-[#E4E3E0] p-8 shadow-2xl h-full flex flex-col">
                  <div className="flex justify-between items-center border-b border-[#E4E3E0]/10 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Terminal size={20} className="text-blue-400" />
                      <h3 className="font-serif italic text-2xl">Header block Architect</h3>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(headerOutput);
                        alert("Header block copied to clipboard.");
                      }}
                      className="text-[10px] font-mono uppercase bg-white text-black px-4 py-2 hover:bg-opacity-80 transition-all font-bold tracking-widest flex items-center gap-2"
                    >
                      <ClipboardCopy size={14} /> Copy Header
                    </button>
                  </div>

                  <div className="flex-1 font-mono text-xs leading-relaxed bg-black/40 p-6 border border-white/5 overflow-x-auto whitespace-pre">
                    {headerOutput || '// Awaiting Sender Email input...'}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                     <div className="p-4 border border-white/10 bg-white/5 opacity-50">
                        <span className="block font-mono text-[8px] uppercase tracking-widest text-blue-300 mb-1">DMARC Status</span>
                        <span className="block font-serif italic text-lg text-white">Full Alignment</span>
                     </div>
                     <div className="p-4 border border-white/10 bg-white/5 opacity-50">
                        <span className="block font-mono text-[8px] uppercase tracking-widest text-green-300 mb-1">Randomization</span>
                        <span className="block font-serif italic text-lg text-white">Active (v2.1)</span>
                     </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'commander' && (
            <motion.div 
              key="commander"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white border border-[#141414] p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-2 border-b border-[#141414] pb-2">
                    <ShieldCheck size={18} />
                    <h3 className="font-serif italic text-xl font-bold uppercase tracking-tight">Mission Control</h3>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest">Select SOP Workflow</label>
                      <select 
                        value={activeWorkflow}
                        onChange={(e) => {
                          setActiveWorkflow(e.target.value);
                          setCompletedSteps([]);
                          setCurrentStep(1);
                        }}
                        className="w-full bg-[#f8f8f8] border border-[#141414] p-3 font-mono text-sm focus:outline-none"
                      >
                        <option value="warmup">Warmup from Zero (v1.0)</option>
                        <option value="production" disabled>Production Scaling (Coming Soon)</option>
                      </select>
                    </div>

                    <div className="bg-[#141414] p-6 text-[#E4E3E0]">
                      <h4 className="font-mono text-[10px] uppercase tracking-widest opacity-40 mb-4">Integrity Status</h4>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span>Progress</span>
                          <span>{Math.round((completedSteps.length / 7) * 100)}%</span>
                        </div>
                        <div className="h-1 bg-white/10 w-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(completedSteps.length / 7) * 100}%` }}
                             className="h-full bg-blue-500"
                           />
                        </div>
                        <p className="text-[8px] opacity-30 italic mt-2 uppercase tracking-tighter">One IP = One Sender + One Newsletter</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-8">
                 <div className="flex flex-col gap-4">
                    {[
                      {
                        id: 1,
                        title: "01: Identity & Infrastructure Prep",
                        content: (
                          <div className="flex flex-col gap-3 text-[11px] font-mono">
                            <p className="text-[#141414]/60">Register a new domain and assign a Unique IP.</p>
                            <ul className="list-disc list-inside flex flex-col gap-1 opacity-80">
                              <li>One IP = One Sender + One Newsletter</li>
                              <li>Create sender as <span className="font-bold underline">alias@newdomain.com</span></li>
                              <li>DNS Check: Ensure SPF, DKIM, and DMARC are active</li>
                            </ul>
                          </div>
                        )
                      },
                      {
                        id: 2,
                        title: "02: Creative Asset Preparation",
                        content: (
                          <div className="flex flex-col gap-3 text-[11px] font-mono">
                            <p className="text-[#141414]/60">Build a fresh newsletter using "Decoded" HTML.</p>
                            <div className="bg-[#f8f8f8] p-3 border border-[#141414]/5">
                               <p className="text-[9px] uppercase font-bold text-red-600 mb-1">Standard Variety Rule:</p>
                               <span className="opacity-70 italic">Use images-only OR text-image mix. No links allowed in initial warmup rounds.</span>
                            </div>
                          </div>
                        )
                      },
                      {
                        id: 3,
                        title: "03: Campaign Initialization",
                        content: (
                          <div className="flex flex-col gap-3 text-[11px] font-mono">
                            <p className="text-[#141414]/60">Configure the mailing platform campaign.</p>
                            <ul className="list-disc list-inside flex flex-col gap-1 opacity-80">
                              <li>Naming Convention: <code className="bg-black/5 px-1">warmup01...n</code></li>
                              <li>Offer Selection: MUST pick <span className="text-blue-600 font-bold">N875Warmup17485</span></li>
                              <li>Action: Click Save, then Pen Icon to enter editor.</li>
                            </ul>
                          </div>
                        )
                      },
                      {
                        id: 4,
                        title: "04: Technical Injection (Synchronized)",
                        content: (
                          <div className="flex flex-col gap-4 text-[11px] font-mono">
                            <div className="flex flex-col gap-2">
                               <span className="text-[9px] uppercase opacity-40 font-bold">Header Data (Pulled from Phase 7):</span>
                               <pre className="bg-[#141414] text-xs text-blue-200 p-4 border overflow-x-auto whitespace-pre leading-relaxed">
                                  {headerOutput || '// ALERT: No header found in Phase 7. Please configure sender first.'}
                               </pre>
                            </div>
                            <p className="text-[#141414]/60 italic font-bold">Paste the decoded newsletter HTML into the body field below the header.</p>
                          </div>
                        )
                      },
                      {
                        id: 5,
                        title: "05: Launch Parameters (Xdelay)",
                        content: (
                          <div className="flex flex-col gap-3 text-[11px] font-mono">
                            <div className="grid grid-cols-2 gap-4 bg-[#f8f8f8] p-4 border border-[#141414]/10">
                               <div>
                                  <span className="block text-[8px] uppercase opacity-40">Timing</span>
                                  <span className="font-bold">2m / 1 Fraction</span>
                               </div>
                               <div>
                                  <span className="block text-[8px] uppercase opacity-40">Loop Strategy</span>
                                  <span className="font-bold">Match Datalist Count</span>
                               </div>
                            </div>
                            <p className="text-[#141414]/60">Xdelay String: Ensure it matches the <code className="bg-black/5 px-1 font-bold">1_12000000</code> format.</p>
                          </div>
                        )
                      },
                      {
                        id: 6,
                        title: "06: Engagement Process (GM2 Reporting)",
                        content: (
                          <div className="flex flex-col gap-4 text-[11px] font-mono">
                            <p className="text-[#141414]/60">Initialize real-time user interaction processes.</p>
                            <a 
                              href="http://etr74.gm2reporting.com/app/processes" 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-full bg-blue-600 text-white p-3 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all font-bold uppercase tracking-widest text-[10px]"
                            >
                              <ExternalLink size={14} /> Open Processes Manager
                            </a>
                            <div className="bg-black/5 p-3 flex flex-col gap-2">
                               <span className="text-[9px] font-bold">CONFIG CHECKLIST:</span>
                               <div className="flex gap-4">
                                  <div className="flex items-center gap-1 opacity-60"><input type="checkbox" readOnly checked /> Google</div>
                                  <div className="flex items-center gap-1 opacity-60"><input type="checkbox" readOnly checked /> Profile: Public</div>
                                  <div className="flex items-center gap-1 opacity-60"><input type="checkbox" readOnly checked /> Action: Not Spam</div>
                               </div>
                            </div>
                          </div>
                        )
                      },
                      {
                        id: 7,
                        title: "07: Verification & Scaling",
                        content: (
                          <div className="flex flex-col gap-3 text-[11px] font-mono">
                            <p className="text-[#141414]/60 italic font-bold text-green-600">MISSION SUCCESS CRITERIA met if inboxing confirmed.</p>
                            <div className="p-4 border border-dashed border-[#141414]/20 flex flex-col gap-2">
                               <p>Monitor for "Failed" status in platform logs.</p>
                               <span className="text-[9px] uppercase">If confirmed: Duplicate datalist &rarr; Restart from Step 3.</span>
                            </div>
                          </div>
                        )
                      }
                    ].map((step) => {
                      const isCompleted = completedSteps.includes(step.id);
                      const isLocked = step.id > completedSteps.length + 1;
                      
                      return (
                        <div 
                          key={step.id} 
                          className={`bg-white border transition-all ${isLocked ? 'opacity-25 pointer-events-none' : 'opacity-100'} ${isCompleted ? 'border-green-500/30' : 'border-[#141414] shadow-sm'}`}
                        >
                          <div 
                            className={`p-4 flex items-center justify-between cursor-pointer ${isCompleted ? 'bg-green-50' : 'bg-[#f8f8f8] border-b border-[#141414]/10'}`}
                            onClick={() => {
                              if (!isLocked) {
                                if (isCompleted) {
                                  setCompletedSteps(completedSteps.filter(id => id !== step.id));
                                } else {
                                  setCompletedSteps([...completedSteps, step.id]);
                                }
                              }
                            }}
                          >
                             <h4 className="font-serif italic font-bold tracking-tight text-lg">{step.title}</h4>
                             <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-[#141414]/20 text-transparent'}`}>
                               <Check size={14} strokeWidth={4} />
                             </div>
                          </div>
                          {!isLocked && (
                            <motion.div 
                              initial={false}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="p-6 overflow-hidden"
                            >
                               {step.content}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                 </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'mixmaster' && (
            <motion.div 
              key="mixmaster"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <section className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white border border-[#141414] p-8 flex flex-col gap-6 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-[#141414] pb-2">
                    <Activity size={18} />
                    <h3 className="font-serif italic text-xl font-bold uppercase tracking-tight">Campaign Data Input</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Input A */}
                    <div className="flex flex-col gap-2">
                       <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest flex items-center gap-1.5">
                         <LucideImage size={12} /> Input A: Campaign Table
                       </label>
                       <div 
                         tabIndex={0}
                         className={`relative border-2 border-dashed border-[#141414]/20 h-32 flex items-center justify-center transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${!mixMasterInputA ? 'hover:border-[#141414]/40 bg-[#f8f8f8]' : 'border-blue-500/50 bg-blue-50/10'}`}
                         onPaste={(e) => handlePasteImage(e, setMixMasterInputA)}
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={(e) => {
                           e.preventDefault();
                           const file = e.dataTransfer.files[0];
                           if (file && file.type.startsWith('image/')) {
                             const reader = new FileReader();
                             reader.onload = (re) => setMixMasterInputA(re.target?.result as string);
                             reader.readAsDataURL(file);
                           }
                         }}
                       >
                         {mixMasterInputA ? (
                           <>
                             <img src={mixMasterInputA} className="absolute inset-0 w-full h-full object-contain p-2" />
                             <button 
                               onClick={() => setMixMasterInputA(null)}
                               className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg z-10"
                             >
                               <X size={12} />
                             </button>
                           </>
                         ) : (
                           <div className="flex flex-col items-center gap-2 pointer-events-none">
                             <Upload size={24} className="opacity-20" />
                             <span className="font-mono text-[9px] uppercase opacity-40 text-center">Campaign Table<br/>(ID, Name, Category)</span>
                             <p className="text-[7px] opacity-20 font-mono italic uppercase">Click then Ctrl+V</p>
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="absolute inset-0 opacity-0 cursor-pointer" 
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   const reader = new FileReader();
                                   reader.onload = (re) => setMixMasterInputA(re.target?.result as string);
                                   reader.readAsDataURL(file);
                                 }
                               }}
                             />
                           </div>
                         )}
                       </div>
                    </div>

                    {/* Input B */}
                    <div className="flex flex-col gap-2">
                       <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest flex items-center gap-1.5">
                         <Layers size={12} /> Input B: Mixing Panel
                       </label>
                       <div 
                         tabIndex={0}
                         className={`relative border-2 border-dashed border-[#141414]/20 h-32 flex items-center justify-center transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${!mixMasterInputB ? 'hover:border-[#141414]/40 bg-[#f8f8f8]' : 'border-blue-500/50 bg-blue-50/10'}`}
                         onPaste={(e) => handlePasteImage(e, setMixMasterInputB)}
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={(e) => {
                           e.preventDefault();
                           const file = e.dataTransfer.files[0];
                           if (file && file.type.startsWith('image/')) {
                             const reader = new FileReader();
                             reader.onload = (re) => setMixMasterInputB(re.target?.result as string);
                             reader.readAsDataURL(file);
                           }
                         }}
                       >
                         {mixMasterInputB ? (
                           <>
                             <img src={mixMasterInputB} className="absolute inset-0 w-full h-full object-contain p-2" />
                             <button 
                               onClick={() => setMixMasterInputB(null)}
                               className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg z-10"
                             >
                               <X size={12} />
                             </button>
                           </>
                         ) : (
                           <div className="flex flex-col items-center gap-2 pointer-events-none">
                             <Upload size={24} className="opacity-20" />
                             <span className="font-mono text-[9px] uppercase opacity-40 text-center">Mixing Panel<br/>(ISP, Dates, Data Type)</span>
                             <p className="text-[7px] opacity-20 font-mono italic uppercase">Click then Ctrl+V</p>
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="absolute inset-0 opacity-0 cursor-pointer" 
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   const reader = new FileReader();
                                   reader.onload = (re) => setMixMasterInputB(re.target?.result as string);
                                   reader.readAsDataURL(file);
                                 }
                               }}
                             />
                           </div>
                         )}
                       </div>
                    </div>

                    {/* Input C */}
                    <div className="flex flex-col gap-2">
                       <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest flex items-center gap-1.5">
                         <Activity size={12} /> Input C: Volume/Execution Bar
                       </label>
                       <div 
                         tabIndex={0}
                         className={`relative border-2 border-dashed border-[#141414]/20 h-32 flex items-center justify-center transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${!mixMasterInputC ? 'hover:border-[#141414]/40 bg-[#f8f8f8]' : 'border-blue-500/50 bg-blue-50/10'}`}
                         onPaste={(e) => handlePasteImage(e, setMixMasterInputC)}
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={(e) => {
                           e.preventDefault();
                           const file = e.dataTransfer.files[0];
                           if (file && file.type.startsWith('image/')) {
                             const reader = new FileReader();
                             reader.onload = (re) => setMixMasterInputC(re.target?.result as string);
                             reader.readAsDataURL(file);
                           }
                         }}
                       >
                         {mixMasterInputC ? (
                           <>
                             <img src={mixMasterInputC} className="absolute inset-0 w-full h-full object-contain p-2" />
                             <button 
                               onClick={() => setMixMasterInputC(null)}
                               className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg z-10"
                             >
                               <X size={12} />
                             </button>
                           </>
                         ) : (
                           <div className="flex flex-col items-center gap-2 pointer-events-none">
                             <Upload size={24} className="opacity-20" />
                             <span className="font-mono text-[9px] uppercase opacity-40 text-center">Volume Bar<br/>(Sent Length)</span>
                             <p className="text-[7px] opacity-20 font-mono italic uppercase">Click then Ctrl+V</p>
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="absolute inset-0 opacity-0 cursor-pointer" 
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   const reader = new FileReader();
                                   reader.onload = (re) => setMixMasterInputC(re.target?.result as string);
                                   reader.readAsDataURL(file);
                                 }
                               }}
                             />
                           </div>
                         )}
                       </div>
                    </div>

                    {/* Revenue Input */}
                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase opacity-50 tracking-widest flex items-center gap-1.5">
                         <DollarSign size={12} /> Reported Revenue
                       </label>
                       <input 
                         type="text" 
                         value={revenueInput}
                         onChange={(e) => setRevenueInput(e.target.value)}
                         placeholder="$420.00"
                         className="w-full bg-[#f8f8f8] border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                       />
                    </div>

                    <button
                      onClick={analyzeMixMaster}
                      disabled={isAnalyzingMix || isSyncing || !mixMasterInputA || !mixMasterInputB || !mixMasterInputC || !revenueInput}
                      className={`w-full py-4 font-mono uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                        isAnalyzingMix || isSyncing || !mixMasterInputA || !mixMasterInputB || !mixMasterInputC || !revenueInput
                          ? 'bg-[#141414] bg-opacity-20 text-[#141414] text-opacity-30 cursor-not-allowed'
                          : 'bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90 shadow-lg hover:translate-y-[-2px]'
                      }`}
                    >
                      {isAnalyzingMix ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Synchronizing Analysis...
                        </>
                      ) : isSyncing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Syncing with Ledger...
                        </>
                      ) : (
                        <>
                          <Zap size={18} />
                          Extract Target Row
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-7 flex flex-col gap-6">
                 <div className="bg-[#141414] text-[#E4E3E0] p-8 shadow-2xl min-h-[620px] flex flex-col">
                    <div className="flex justify-between items-center border-b border-[#E4E3E0]/10 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <Monitor size={20} className="text-blue-400" />
                        <h3 className="font-serif italic text-2xl">Mix Master Performance Output</h3>
                      </div>
                      <div className="flex gap-2">
                         <span className="font-mono text-[8px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-sm uppercase">OCR Active</span>
                         <span className="font-mono text-[8px] bg-green-500/20 text-green-300 px-2 py-1 rounded-sm uppercase">Logic v6.0</span>
                      </div>
                    </div>

                    {!mixMasterResult ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-4">
                        <Search size={48} />
                        <div className="flex flex-col gap-1">
                          <p className="font-serif italic text-lg">Awaiting Campaign Assets</p>
                          <p className="font-mono text-[9px] uppercase tracking-widest max-w-[250px]">Upload screenshots to generate standardized performance data row</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-700">
                        <div className="flex flex-col gap-4 overflow-x-auto">
                           <div className="flex items-center gap-2">
                             <Award size={18} className="text-blue-400" />
                             <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Standardized Target Row</span>
                           </div>
                           
                           {/* Markdown Table Mockup */}
                           <table className="w-full font-mono text-[10px] border-collapse bg-white/5 border border-white/10">
                             <thead>
                               <tr className="bg-white/10 text-white/50 uppercase text-[8px] tracking-tighter">
                                 <th className="p-2 text-left border-r border-white/10">Offer Name</th>
                                 <th className="p-2 text-left border-r border-white/10">Offer ID</th>
                                 <th className="p-2 text-left border-r border-white/10">list name</th>
                                 <th className="p-2 text-left border-r border-white/10">length</th>
                                 <th className="p-2 text-left border-r border-white/10">list date</th>
                                 <th className="p-2 text-left border-r border-white/10">Status</th>
                                 <th className="p-2 text-left border-r border-white/10">Category</th>
                                 <th className="p-2 text-left border-r border-white/10">Data Type</th>
                                 <th className="p-2 text-left border-r border-white/10">Geo</th>
                                 <th className="p-2 text-left border-r border-white/10">rev</th>
                                 <th className="p-2 text-left">rev/K</th>
                               </tr>
                             </thead>
                             <tbody>
                               <tr className="border-t border-white/10 hover:bg-white/5 transition-colors">
                                 <td className="p-2 border-r border-white/10 text-blue-300">{mixMasterResult.offerName}</td>
                                 <td className="p-2 border-r border-white/10 opacity-70">{mixMasterResult.offerId}</td>
                                 <td className="p-2 border-r border-white/10 font-bold">{mixMasterResult.listName}</td>
                                 <td className="p-2 border-r border-white/10 text-green-400">{mixMasterResult.length}</td>
                                 <td className="p-2 border-r border-white/10 opacity-70">{mixMasterResult.listDate}</td>
                                 <td className="p-2 border-r border-white/10"><span className="bg-green-500/20 text-green-400 px-1 py-0.5 rounded-[2px]">{mixMasterResult.status}</span></td>
                                 <td className="p-2 border-r border-white/10 opacity-70">{mixMasterResult.category}</td>
                                 <td className="p-2 border-r border-white/10 text-orange-300">{mixMasterResult.dataType}</td>
                                 <td className="p-2 border-r border-white/10 font-bold">{mixMasterResult.geo}</td>
                                 <td className="p-2 border-r border-white/10 text-blue-400">{mixMasterResult.rev}</td>
                                 <td className="p-2 font-bold bg-blue-500/10 text-blue-300">{mixMasterResult.revK}</td>
                               </tr>
                             </tbody>
                           </table>
                        </div>

                        <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
                          <div className="flex justify-between items-end">
                            <label className="font-mono text-[9px] uppercase opacity-40 tracking-widest flex items-center gap-1.5">
                              <ClipboardCopy size={12} /> Raw Markdown Output
                            </label>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(mixMasterResult.markdownRow);
                                alert("Standardized row copied to clipboard.");
                              }}
                              className="text-[9px] font-mono uppercase bg-white text-black px-2 py-1 hover:bg-opacity-80 transition-all font-bold"
                            >
                              Copy Row
                            </button>
                          </div>
                          <div className="bg-black/20 p-4 font-mono text-[9px] text-[#E4E3E0]/60 leading-relaxed overflow-x-auto whitespace-pre">
                            {mixMasterResult.markdownRow}
                          </div>
                        </div>

                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 flex items-start gap-3 mt-auto">
                           <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                           <p className="font-mono text-[9px] text-blue-200/60 leading-tight uppercase tracking-wide">
                             Performance Scoring Active: Revenue is cross-referenced with sent volume to determine Scalability Index. Results are normalized to standard tracking formats.
                           </p>
                        </div>
                      </div>
                    )}
                 </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'ledger' && (
            <motion.div 
              key="ledger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-10"
            >
              <LedgerView />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'yahooSimulator' && (
            <motion.div 
              key="yahooSimulator"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-10"
            >
              <YahooFilterSimulator />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'ipOracle' && (
            <motion.div 
              key="ipOracle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-10"
            >
              <IPOracleMatrix />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Error Modal */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-[#E4E3E0] bg-opacity-95 z-50 p-8 text-center"
            >
              <div className="flex flex-col items-center gap-4 max-w-xs bg-white p-8 border border-[#141414] shadow-2xl">
                <AlertCircle size={48} className="text-red-600" />
                <p className="font-serif italic text-lg">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-6 py-2 hover:bg-opacity-90 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 mt-8 border-t border-[#141414] border-opacity-10 bg-white bg-opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase opacity-40 tracking-widest">Tool Purpose</h3>
            <p className="text-xs leading-relaxed opacity-70">
              A comprehensive suite for DNS/IP collection and professional email content preparation for inbox testing.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase opacity-40 tracking-widest">Smart Sanitization</h3>
            <p className="text-xs leading-relaxed opacity-70">
              Decodes Quoted-Printable text and strips non-essential links while preserving your protected offer block and tracking pixels.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase opacity-40 tracking-widest">Accuracy & Privacy</h3>
            <p className="text-xs leading-relaxed opacity-70">
              Verified ISP data via triple-check verification. All data processing (parsing/sanitization) is performed locally.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
