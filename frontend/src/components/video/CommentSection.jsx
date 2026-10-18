import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  Flag,
  Languages,
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { commentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatTimeAgo, resolveMediaUrl } from '../../utils/formatters';

const REPORT_REASONS = [
  ['spam', 'Spam'],
  ['harassment', 'Harassment'],
  ['offensive-content', 'Offensive content'],
  ['misinformation', 'Misinformation'],
  ['other', 'Other'],
];

const CommentSection = ({ videoId, commentsCount: initialCount = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState('newest');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [postedCount, setPostedCount] = useState(0);
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [translations, setTranslations] = useState({});
  const [history, setHistory] = useState({});

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await commentService.getVideoComments(videoId, { sort });
      if (response.data?.success) {
        setComments(response.data.comments || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load comments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, sort, videoId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const requestCaptcha = async () => {
    try {
      const response = await commentService.createCaptcha();
      if (response.data?.required) {
        setCaptcha({ id: response.data.challengeId, prompt: response.data.prompt });
        setCaptchaAnswer('');
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Unable to start verification.', 'error');
    }
  };

  const handlePostComment = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      addToast('Please log in to leave a comment.', 'error');
      return;
    }
    if (!newCommentText.trim()) return;

    if (postedCount >= 3 && !captcha) {
      await requestCaptcha();
      return;
    }

    setSubmitting(true);
    try {
      const response = await commentService.createComment(videoId, {
        content: newCommentText.trim(),
        parentId: replyTo || undefined,
        captchaId: captcha?.id,
        captchaAnswer: captchaAnswer || undefined,
      });
      if (response.data?.success) {
        setComments((previous) => [response.data.comment, ...previous]);
        setTotal((previous) => previous + 1);
        setNewCommentText('');
        setReplyTo(null);
        setCaptcha(null);
        setCaptchaAnswer('');
        setPostedCount((previous) => previous + 1);
        addToast('Comment posted.', 'success');
      }
    } catch (error) {
      if (error.response?.status === 428) {
        await requestCaptcha();
      } else {
        addToast(error.response?.data?.message || 'Failed to post comment.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (comment) => {
    if (!editText.trim()) return;
    try {
      const response = await commentService.updateComment(comment._id, {
        content: editText.trim(),
        revision: comment.revision,
      });
      setComments((previous) => previous.map((item) => item._id === comment._id ? response.data.comment : item));
      setEditingId(null);
      addToast('Comment updated.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update comment.', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? Replies will remain in the thread.')) return;
    try {
      await commentService.deleteComment(commentId);
      setComments((previous) => previous.filter((comment) => comment._id !== commentId));
      setTotal((previous) => Math.max(0, previous - 1));
      addToast('Comment deleted.', 'info');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete comment.', 'error');
    }
  };

  const handleVote = async (commentId, type) => {
    if (!isAuthenticated) {
      addToast('Please log in to react to comments.', 'error');
      return;
    }
    try {
      const response = await commentService.vote(commentId, type);
      setComments((previous) => previous.map((comment) => comment._id === commentId
        ? { ...comment, likesCount: response.data.likesCount, dislikesCount: response.data.dislikesCount, userVote: response.data.userVote }
        : comment));
    } catch (error) {
      addToast(error.response?.data?.message || 'Unable to save your reaction.', 'error');
    }
  };

  const handleReport = async (commentId) => {
    try {
      await commentService.report(commentId, { reason: reportReason });
      setReportingId(null);
      addToast('Report sent for moderator review.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Unable to submit report.', 'error');
    }
  };

  const handleTranslate = async (comment) => {
    const targetLanguage = (navigator.language || 'en').split('-')[0];
    try {
      const response = await commentService.translate({ text: comment.content, targetLanguage });
      setTranslations((previous) => ({ ...previous, [comment._id]: response.data.translatedText }));
    } catch (error) {
      addToast(error.response?.data?.message || 'Translation failed.', 'error');
    }
  };

  const toggleHistory = async (commentId) => {
    if (history[commentId]) {
      setHistory((previous) => ({ ...previous, [commentId]: null }));
      return;
    }
    try {
      const response = await commentService.history(commentId);
      setHistory((previous) => ({ ...previous, [commentId]: response.data.history }));
    } catch (error) {
      addToast(error.response?.data?.message || 'Unable to load edit history.', 'error');
    }
  };

  const thread = useMemo(() => {
    const byParent = new Map();
    comments.forEach((comment) => {
      const key = comment.parent || 'root';
      byParent.set(key, [...(byParent.get(key) || []), comment]);
    });
    const build = (parentId, depth = 0) => (byParent.get(parentId) || []).map((comment) => ({
      ...comment,
      depth,
      children: build(comment._id, depth + 1),
    }));
    return build('root');
  }, [comments]);

  const renderComment = (comment) => {
    const isOwner = user && comment.user?._id === user._id;
    const canEdit = isOwner && Date.now() - new Date(comment.createdAt).getTime() < 15 * 60 * 1000;
    return (
      <article key={comment._id} className="flex gap-3 group" style={{ marginLeft: `${Math.min(comment.depth, 4) * 22}px` }}>
        <img
          src={resolveMediaUrl(comment.user?.avatar)}
          alt={comment.user?.username || 'User'}
          className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 border border-gray-200 dark:border-gray-700"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-xs text-gray-900 dark:text-gray-200">@{comment.user?.username || 'anonymous'}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400" title={new Date(comment.createdAt).toLocaleString()}>{formatTimeAgo(comment.createdAt)}</span>
            {comment.edited && <button onClick={() => toggleHistory(comment._id)} className="text-[10px] text-gray-500 underline">edited · history</button>}
          </div>

          {editingId === comment._id ? (
            <div className="mt-2 space-y-2">
              <textarea value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={2000} rows={2} className="w-full p-2.5 rounded-xl border border-brand-500 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={() => handleUpdateComment(comment)} className="px-3 py-1 bg-brand-500 text-white rounded-lg text-xs font-semibold">Save</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-200 dark:bg-[#2a2a2a] rounded-lg text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              {translations[comment._id] && <p className="mt-2 border-l-2 border-brand-500 pl-3 text-sm text-gray-600 dark:text-gray-300">{translations[comment._id]}</p>}
            </>
          )}

          {history[comment._id] && (
            <div className="mt-2 rounded-xl bg-gray-50 dark:bg-[#191919] p-3 space-y-2">
              {history[comment._id].map((entry) => <p key={`${entry.at}-${entry.content}`} className="text-xs text-gray-600 dark:text-gray-300"><time>{new Date(entry.at).toLocaleString()}</time> — {entry.content}</p>)}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <button onClick={() => handleVote(comment._id, 'like')} aria-label="Like comment" className="flex items-center gap-1 hover:text-brand-500"><ThumbsUp className="w-3.5 h-3.5" />{comment.likesCount || 0}</button>
            <button onClick={() => handleVote(comment._id, 'dislike')} aria-label="Dislike comment" className="flex items-center gap-1 hover:text-brand-500"><ThumbsDown className="w-3.5 h-3.5" />{comment.dislikesCount || 0}</button>
            {isAuthenticated && comment.depth < 4 && <button onClick={() => { setReplyTo(comment._id); setNewCommentText(`@${comment.user?.username || ''} `); }} className="flex items-center gap-1 hover:text-brand-500"><MessageCircle className="w-3.5 h-3.5" />Reply</button>}
            <button onClick={() => handleTranslate(comment)} className="flex items-center gap-1 hover:text-brand-500"><Languages className="w-3.5 h-3.5" />Translate</button>
            {canEdit && editingId !== comment._id && <button onClick={() => { setEditingId(comment._id); setEditText(comment.content); }} className="flex items-center gap-1 hover:text-brand-500"><Edit2 className="w-3 h-3" />Edit</button>}
            {canEdit && <button onClick={() => handleDeleteComment(comment._id)} className="flex items-center gap-1 hover:text-red-500"><Trash2 className="w-3 h-3" />Delete</button>}
            {isAuthenticated && !isOwner && <button onClick={() => { setReportingId(reportingId === comment._id ? null : comment._id); setReportReason('spam'); }} className="flex items-center gap-1 hover:text-red-500"><Flag className="w-3 h-3" />Report</button>}
          </div>
          {reportingId === comment._id && (
            <div className="mt-2 flex items-center gap-2">
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#191919] px-2 py-1 text-xs">
                {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button onClick={() => handleReport(comment._id)} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white">Submit report</button>
              <button onClick={() => setReportingId(null)} aria-label="Cancel report"><X className="h-4 w-4" /></button>
            </div>
          )}
          {comment.children?.length > 0 && <div className="mt-5 space-y-5">{comment.children.map(renderComment)}</div>}
        </div>
      </article>
    );
  };

  return (
    <section className="mt-6 border-t border-gray-200 dark:border-[#272727] pt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{total} Comments</h3>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort comments" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] px-3 py-2 text-xs text-gray-700 dark:text-gray-200">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="liked">Most liked</option>
          <option value="relevant">Most relevant</option>
        </select>
      </div>

      <div className="flex gap-4 mb-8">
        <img src={user ? resolveMediaUrl(user.avatar) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
        <form onSubmit={handlePostComment} className="flex-1">
          {replyTo && <div className="mb-2 flex items-center gap-2 text-xs text-brand-500">Replying to a comment <button type="button" onClick={() => { setReplyTo(null); setNewCommentText(''); }}><X className="h-3 w-3" /></button></div>}
          <textarea value={newCommentText} onChange={(event) => setNewCommentText(event.target.value)} placeholder={isAuthenticated ? 'Add a constructive comment...' : 'Log in to join the conversation...'} rows={2} maxLength={2000} disabled={!isAuthenticated} className="w-full p-3 rounded-xl border border-gray-200 dark:border-[#2f2f2f] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-500 resize-none disabled:opacity-50" />
          {captcha && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">{captcha.prompt}</span>
              <input inputMode="numeric" aria-label="Verification answer" value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value)} className="w-20 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm dark:bg-[#191919]" />
              <span className="text-[10px] text-amber-700 dark:text-amber-300">One-use challenge · expires in 2 minutes</span>
            </div>
          )}
          {newCommentText.trim() && (
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setNewCommentText(''); setCaptcha(null); setCaptchaAnswer(''); }} className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300">Cancel</button>
              <button type="submit" disabled={submitting || (captcha && !captchaAnswer.trim())} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-500 text-white disabled:opacity-50">{submitting ? 'Posting...' : 'Comment'}</button>
            </div>
          )}
        </form>
      </div>

      {loading ? <p className="py-6 text-center text-sm text-gray-500">Loading comments…</p> : thread.length === 0 ? (
        <p className="py-6 text-center text-sm italic text-gray-500 dark:text-gray-400">No comments yet. Be the first to share your thoughts!</p>
      ) : <div className="space-y-6">{thread.map(renderComment)}</div>}
    </section>
  );
};

export default CommentSection;
