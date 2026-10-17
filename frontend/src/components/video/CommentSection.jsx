import React, { useState, useEffect } from 'react';
import { ThumbsUp, MoreVertical, Edit2, Trash2, Send } from 'lucide-react';
import { commentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatTimeAgo, resolveMediaUrl } from '../../utils/formatters';

const CommentSection = ({ videoId, commentsCount: initialCount = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Fetch comments
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    commentService
      .getVideoComments(videoId)
      .then((res) => {
        if (isMounted && res.data?.success) {
          setComments(res.data.comments);
          setTotal(res.data.total);
        }
      })
      .catch((err) => {
        console.error('Failed to load comments:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please log in to leave a comment', 'error');
      return;
    }
    if (!newCommentText.trim()) return;

    setSubmitting(true);
    try {
      const res = await commentService.createComment(videoId, {
        content: newCommentText.trim(),
      });
      if (res.data?.success) {
        setComments([res.data.comment, ...comments]);
        setTotal((prev) => prev + 1);
        setNewCommentText('');
        addToast('Comment posted', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editText.trim()) return;
    try {
      const res = await commentService.updateComment(commentId, {
        content: editText.trim(),
      });
      if (res.data?.success) {
        setComments(
          comments.map((c) => (c._id === commentId ? res.data.comment : c))
        );
        setEditingId(null);
        addToast('Comment updated', 'success');
      }
    } catch (err) {
      addToast('Failed to update comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentService.deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('Comment deleted', 'info');
    } catch (err) {
      addToast('Failed to delete comment', 'error');
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-[#272727] pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {total} Comments
        </h3>
      </div>

      {/* Add Comment Input */}
      <div className="flex gap-4 mb-8">
        <img
          src={
            user
              ? resolveMediaUrl(user.avatar)
              : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
          }
          alt="Avatar"
          className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
        />

        <form onSubmit={handlePostComment} className="flex-1">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={
              isAuthenticated
                ? 'Add a constructive comment...'
                : 'Log in to join the conversation...'
            }
            rows={2}
            disabled={!isAuthenticated}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-[#2f2f2f] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-500 transition resize-none disabled:opacity-50"
          />

          {newCommentText.trim().length > 0 && (
            <div className="flex justify-end gap-2 mt-2 animate-fade-in">
              <button
                type="button"
                onClick={() => setNewCommentText('')}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition disabled:opacity-50 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Posting...' : 'Comment'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#242424] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-[#242424] rounded-md w-1/4" />
                <div className="h-3.5 bg-gray-200 dark:bg-[#242424] rounded-md w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center italic">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            const isOwner = user && comment.user?._id === user._id;

            return (
              <div key={comment._id} className="flex gap-3 group">
                <img
                  src={resolveMediaUrl(comment.user?.avatar)}
                  alt={comment.user?.username || 'User'}
                  className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 border border-gray-200 dark:border-gray-700"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-200">
                      @{comment.user?.username || 'anonymous'}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>

                  {editingId === comment._id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-brand-500 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateComment(comment._id)}
                          className="px-3 py-1 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  )}

                  {/* Actions Bar */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <button className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{comment.likesCount || ''}</span>
                    </button>

                    {isOwner && editingId !== comment._id && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(comment._id);
                            setEditText(comment.content);
                          }}
                          className="hover:text-brand-500 flex items-center gap-1 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="hover:text-red-500 flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
