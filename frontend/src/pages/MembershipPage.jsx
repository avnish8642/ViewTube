import React, { useCallback, useEffect, useState } from 'react';
import { Check, Download, LoaderCircle, ShieldCheck, WalletCards } from 'lucide-react';
import { membershipService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(Boolean(window.Razorpay));
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const makeIdempotencyKey = () => window.crypto?.randomUUID
  ? window.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

const MembershipPage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState('');
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [planResponse, dashboardResponse] = await Promise.all([
        membershipService.getPlans(),
        membershipService.getDashboard(),
      ]);
      setPlans(planResponse.data.plans || []);
      setDashboard(dashboardResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load membership details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const startCheckout = async (planId) => {
    setPurchasing(planId);
    setError('');
    try {
      const scriptReady = await loadRazorpay();
      if (!scriptReady) throw new Error('Razorpay checkout could not load. Check your connection and try again.');
      const response = await membershipService.createOrder({ plan: planId, period }, makeIdempotencyKey());
      const { order } = response.data;
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'VidSphere',
        description: `${planId[0].toUpperCase()}${planId.slice(1)} ${period} membership`,
        order_id: order.id,
        prefill: { email: user?.email, name: user?.username },
        theme: { color: '#ef4444' },
        handler: async (paymentResponse) => {
          try {
            const verified = await membershipService.verifyPayment(paymentResponse);
            updateUser({ ...user, membership: verified.data.membership || user?.membership });
            addToast(verified.data.receiptEmailed ? 'Membership activated. Your receipt was emailed.' : 'Membership activated. Email receipts need SMTP configuration.', 'success');
            await loadDashboard();
          } catch (verificationError) {
            setError(verificationError.response?.data?.message || 'Payment verification failed. Your membership was not activated.');
          } finally {
            setPurchasing('');
          }
        },
        modal: {
          ondismiss: () => setPurchasing(''),
        },
      });
      checkout.on('payment.failed', (event) => {
        setPurchasing('');
        setError(event.error?.description || 'Payment failed. You have not been charged for an active membership.');
      });
      checkout.open();
    } catch (requestError) {
      setPurchasing('');
      setError(requestError.response?.data?.message || requestError.message || 'Unable to start checkout.');
    }
  };

  const cancelMembership = async () => {
    if (!window.confirm('Disable renewal for this membership? Your paid access stays active until the expiry date.')) return;
    try {
      const response = await membershipService.cancel();
      setDashboard((previous) => ({ ...previous, membership: response.data.membership }));
      addToast(response.data.message, 'success');
    } catch (requestError) {
      addToast(requestError.response?.data?.message || 'Unable to update membership.', 'error');
    }
  };

  const downloadAgain = async (download) => {
    try {
      const response = await membershipService.downloadFile(download._id);
      const fileUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = `${download.video?.title?.replace(/[^\w.-]+/g, '_') || 'video'}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (requestError) {
      addToast(requestError.response?.data?.message || 'Unable to download this file.', 'error');
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto p-8 text-center text-sm text-gray-500">Loading membership dashboard…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6">
      <header className="mb-6 rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-white to-violet-500/10 p-6 dark:via-[#111827]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400"><WalletCards className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.18em]">Membership & downloads</span></div>
            <h1 className="mt-3 text-3xl font-black text-gray-900 dark:text-white">Choose your viewing plan</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">One-time Razorpay checkout. Paid plans are verified by the server and do not auto-renew.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-800 dark:bg-[#111827]">
            <div className="text-xs uppercase tracking-wide text-gray-500">Current plan</div>
            <div className="mt-1 text-xl font-bold capitalize text-gray-900 dark:text-white">{dashboard?.membership?.plan || 'free'}</div>
            <div className="mt-1 text-xs text-gray-500">
              {dashboard?.membership?.expiresAt ? `Valid until ${new Date(dashboard.membership.expiresAt).toLocaleDateString()}` : 'No expiry'}
            </div>
          </div>
        </div>
      </header>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-[#282828] dark:bg-[#181818]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Your download quota</h2>
            <p className="mt-1 text-xs text-gray-500">Resets daily and monthly at midnight IST. Repeated requests for the same video within 24 hours reuse the existing download record.</p>
          </div>
          <div className="flex gap-5 text-sm">
            <div><span className="block text-xs text-gray-500">Today</span><strong>{dashboard?.quota?.dailyRemaining} left</strong></div>
            <div><span className="block text-xs text-gray-500">This month</span><strong>{dashboard?.quota?.monthlyRemaining ?? 'Unlimited'} left</strong></div>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan comparison</h2>
        <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Billing period" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#181818]">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly · 5% off</option>
          <option value="yearly">Yearly · 20% off</option>
        </select>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const months = period === 'yearly' ? 12 : period === 'quarterly' ? 3 : 1;
          const discount = period === 'yearly' ? 0.8 : period === 'quarterly' ? 0.95 : 1;
          const amount = Math.round(plan.price * months * discount);
          const isCurrent = dashboard?.membership?.plan === plan.id;
          return (
            <article key={plan.id} className={`rounded-3xl border p-5 ${isCurrent ? 'border-brand-500 shadow-lg shadow-brand-500/10' : 'border-gray-200 dark:border-[#282828]'} bg-white dark:bg-[#181818]`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                {isCurrent && <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[10px] font-bold text-brand-600 dark:text-brand-400">CURRENT</span>}
              </div>
              <div className="mt-4"><strong className="text-3xl text-gray-900 dark:text-white">₹{amount}</strong><span className="text-xs text-gray-500"> / {period}</span></div>
              <p className="mt-1 text-xs text-gray-500">{plan.dailyDownloads} downloads daily · {plan.id === 'gold' ? 'unlimited monthly' : `${plan.monthlyDownloads} monthly`}</p>
              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"><Check className="h-4 w-4 shrink-0 text-green-500" />{feature}</li>)}
              </ul>
              {plan.id !== 'free' && (
                <button onClick={() => startCheckout(plan.id)} disabled={Boolean(purchasing)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
                  {purchasing === plan.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {isCurrent ? 'Renew / change plan' : 'Choose plan'}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {dashboard?.membership?.plan !== 'free' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#282828] dark:bg-[#181818]">
          <p className="text-sm text-gray-600 dark:text-gray-300">Paid access remains active until {new Date(dashboard.membership.expiresAt).toLocaleDateString()}. Renewals are currently one-time purchases.</p>
          <button onClick={cancelMembership} className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">Disable renewal</button>
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white"><Download className="mr-2 inline h-5 w-5 text-brand-500" />Downloads</h2>
        {(dashboard?.downloads || []).length === 0 ? (
          <p className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-500 dark:border-[#282828]">Your authorized video downloads will appear here.</p>
        ) : (
          <div className="space-y-3">
            {dashboard.downloads.map((download) => (
              <div key={download._id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-[#282828] dark:bg-[#181818]">
                <img src={download.video?.thumbnailUrl} alt="" className="h-16 w-28 rounded-lg bg-gray-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{download.video?.title || 'Video unavailable'}</p>
                  <p className="mt-1 text-xs text-gray-500">{new Date(download.requestedAt).toLocaleString()} · {download.status} · {download.plan} plan {download.fileSize ? `· ${(download.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                </div>
                {download.video && download.status !== 'failed' && <button onClick={() => downloadAgain(download)} className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white">Download again</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Billing history</h2>
        {(dashboard?.payments || []).length === 0 ? <p className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-500 dark:border-[#282828]">No payments recorded yet.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#282828]">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 dark:bg-[#171717]"><tr><th className="p-3">Invoice</th><th className="p-3">Plan</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
              <tbody>{dashboard.payments.map((payment) => <tr key={payment._id} className="border-t border-gray-200 dark:border-[#282828]"><td className="p-3 font-mono">{payment.invoiceNumber}</td><td className="p-3 capitalize">{payment.plan} · {payment.period}</td><td className="p-3">₹{(payment.amount / 100).toFixed(2)}</td><td className="p-3 capitalize">{payment.status}</td><td className="p-3">{new Date(payment.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MembershipPage;
