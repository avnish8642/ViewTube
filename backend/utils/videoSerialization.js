export const redactPremiumVideoSource = (video) => {
  const data = video?.toObject ? video.toObject() : { ...video };
  if (data?.premium) data.videoUrl = '';
  return data;
};
