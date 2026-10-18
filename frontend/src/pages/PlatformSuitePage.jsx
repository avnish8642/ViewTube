import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDashed, Lock, MessageSquareText, MonitorPlay, ShieldCheck, Sparkles, Video, WalletCards, Download, Users, Globe2, Settings2 } from 'lucide-react';
import { featureSuiteService } from '../services/api';

const MODULE_ICONS = {
  MonitorPlay,
  Download,
  WalletCards,
  Video,
  ShieldCheck,
  MessageSquareText,
};

const fallbackModules = [
  {
    id: 'meetflow',
    name: 'MeetFlow Live Rooms',
    category: 'Video Calling',
    summary: 'Password-protected group calls with live participation, screen sharing, role-based moderation, and meeting controls for creator collaborations.',
    highlights: ['Secure room access', 'Live participant roster', 'Screen sharing', 'Host controls'],
    metrics: ['6 participant cap', 'Realtime chat', 'Device switching'],
    accent: 'from-red-500 to-orange-400',
    icon: MonitorPlay,
  },
  {
    id: 'vdm',
    name: 'VDM Download Vault',
    category: 'Subscription & Downloads',
    summary: 'Quota-aware downloads, plan enforcement, secure streaming, and audit-friendly analytics for premium media libraries.',
    highlights: ['Tiered plans', 'Atomic quota checks', 'Duplicate prevention', 'Server-side validation'],
    metrics: ['Free to Gold', 'Daily limits', 'Concurrent guardrails'],
    accent: 'from-cyan-500 to-blue-500',
    icon: Download,
  },
  {
    id: 'aura',
    name: 'AuraStream Billing',
    category: 'Payments',
    summary: 'One-time paid plan flows with Razorpay checkout, invoicing, subscription dashboards, and premium access gating.',
    highlights: ['Hosted payment flows', 'Plan dashboard', 'Billing history', 'Secure checkout'],
    metrics: ['Razorpay verification', 'INR plans', 'Invoice tracking'],
    accent: 'from-violet-500 to-purple-500',
    icon: WalletCards,
  },
  {
    id: 'player',
    name: 'Custom Player Lab',
    category: 'Playback',
    summary: 'Enhanced viewer controls like seek, volume, fullscreen, keyboard shortcuts, timeline scrubbing, and optimized streaming UX.',
    highlights: ['Custom timeline', 'Keyboard shortcuts', 'Fullscreen', 'Range streaming'],
    metrics: ['10s skip controls', 'Progress tracking', 'Immersive watch experience'],
    accent: 'from-emerald-500 to-teal-500',
    icon: Video,
  },
  {
    id: 'northstar',
    name: 'Northstar Security Center',
    category: 'Authentication',
    summary: 'Adaptive login monitoring, trusted device checks, OTP validation, GeoIP-aware security signals, and device trust controls.',
    highlights: ['Context-aware login', 'OTP verification', 'Trusted devices', 'Security activity log'],
    metrics: ['OTP verification', 'Optional GeoIP lookup', 'Device history'],
    accent: 'from-amber-500 to-yellow-500',
    icon: ShieldCheck,
  },
  {
    id: 'commonplace',
    name: 'Commonplace Moderation Hub',
    category: 'Community',
    summary: 'Multilingual comment threads, automated translation, moderation review queue, report workflows, and spam protection for communities.',
    highlights: ['Translation pipeline', 'Report triage', 'Content governance', 'Guest session safety'],
    metrics: ['12 posts / 10 min', '3-step review flow', 'Language-aware moderation'],
    accent: 'from-pink-500 to-rose-500',
    icon: MessageSquareText,
  },
];

const PlatformSuitePage = () => {
  const [modules, setModules] = useState(fallbackModules);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSuite = async () => {
      try {
        const response = await featureSuiteService.getPlatformModules();
        if (isMounted && response?.data?.modules?.length) {
          setModules(response.data.modules);
        }
      } catch (err) {
        if (isMounted) {
          setError('Using the built-in combined feature set while the live platform catalog is unavailable.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSuite();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-white to-cyan-500/10 dark:from-brand-500/10 dark:via-[#111827] dark:to-cyan-500/10 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-[#141821] border border-brand-500/20 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase text-brand-600 dark:text-brand-400">
              <Sparkles className="w-3.5 h-3.5" />
              Platform expansion
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              VidSphere + six specialty products
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-600 dark:text-gray-300">
              The main YouTube project now includes community moderation, secure account intelligence, premium billing, download quotas, live meetings, and a richer streaming experience—combined into one unified media platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-200">
            <div className="rounded-2xl bg-white/80 dark:bg-[#111827] border border-gray-200 dark:border-gray-800 px-4 py-3 backdrop-blur-sm">
              <div className="text-xl font-bold text-brand-500">6</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">feature packs</div>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-[#111827] border border-gray-200 dark:border-gray-800 px-4 py-3 backdrop-blur-sm">
              <div className="text-xl font-bold text-brand-500">1</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">unified hub</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Creator workspace', value: 'Live + upload + moderation' },
          { label: 'Monetization', value: 'Payments + quotas + plans' },
          { label: 'Trust & safety', value: 'Security + compliance + review' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{item.label}</div>
            <div className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/15 dark:text-amber-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="animate-pulse rounded-3xl border border-gray-200 dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5">
              <div className="h-10 w-10 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="mt-4 h-4 w-2/5 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="mt-3 h-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = typeof module.icon === 'string'
              ? MODULE_ICONS[module.icon] || CircleDashed
              : module.icon || CircleDashed;
            return (
              <article key={module.id} className="group rounded-3xl border border-gray-200 dark:border-[#1f2937] bg-white dark:bg-[#111827] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${module.accent || 'from-brand-500 to-cyan-500'} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{module.category}</div>
                    <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{module.name}</h2>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-1" />
                </div>

                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{module.summary}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {module.highlights?.map((item) => (
                    <span key={item} className="rounded-full bg-gray-100 dark:bg-[#1b2330] px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-200">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 space-y-2 border-t border-gray-200 dark:border-[#1f2937] pt-4">
                  {module.metrics?.map((metric) => (
                    <div key={metric} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{metric}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-gray-200 dark:border-[#1f2937] bg-white dark:bg-[#111827] p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 dark:bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">
              <Lock className="h-3.5 w-3.5" />
              operational summary
            </div>
            <h3 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">One platform, many mission-critical workflows</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Users className="h-4 w-4" />
            Creator network + user trust layer
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            'Secure auth flows and session monitoring',
            'Premium memberships and quota enforcement',
            'Real-time collaboration features',
            'Multilingual, moderated community interactions',
          ].map((text) => (
            <div key={text} className="rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#1f2937] p-4 text-sm text-gray-700 dark:text-gray-200 flex items-start gap-3">
              <Settings2 className="mt-0.5 h-4 w-4 text-brand-500 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlatformSuitePage;
