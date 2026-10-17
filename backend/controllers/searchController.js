import Video from '../models/Video.js';
import Channel from '../models/Channel.js';

// @desc    Search videos and channels
// @route   GET /api/search
// @access  Public
export const search = async (req, res, next) => {
  try {
    const { q = '', category, sort, page = 1, limit = 20 } = req.query;
    const queryStr = q.trim();

    if (!queryStr) {
      return res.status(200).json({
        success: true,
        query: '',
        count: 0,
        total: 0,
        videos: [],
        matchingChannels: [],
      });
    }

    const regex = new RegExp(queryStr, 'i');

    // Find channels matching name or handle
    const matchingChannels = await Channel.find({
      $or: [{ name: regex }, { handle: regex }],
    })
      .select('name handle avatar banner description subscribersCount')
      .limit(3);

    const matchingChannelIds = matchingChannels.map((c) => c._id);

    // Build video filter
    const videoFilter = {
      visibility: 'public',
      $or: [
        { title: regex },
        { description: regex },
        { tags: { $in: [regex] } },
        { channel: { $in: matchingChannelIds } },
      ],
    };

    if (category && category !== 'All') {
      videoFilter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Sort options
    let sortOptions = { views: -1, createdAt: -1 };
    if (sort === 'date' || sort === 'latest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'views') {
      sortOptions = { views: -1 };
    } else if (sort === 'rating' || sort === 'likes') {
      sortOptions = { likesCount: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
      Video.find(videoFilter)
        .populate('channel', 'name handle avatar subscribersCount')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Video.countDocuments(videoFilter),
    ]);

    res.status(200).json({
      success: true,
      query: queryStr,
      count: videos.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      matchingChannels,
      videos,
    });
  } catch (error) {
    next(error);
  }
};
