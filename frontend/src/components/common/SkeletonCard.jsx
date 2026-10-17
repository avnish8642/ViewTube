import React from 'react';

export const SkeletonCard = ({ layout = 'grid' }) => {
  if (layout === 'horizontal') {
    return (
      <div className="flex flex-col sm:flex-row gap-4 p-2 rounded-2xl animate-pulse">
        <div className="w-full sm:w-64 aspect-video rounded-xl bg-gray-200 dark:bg-[#202020] shrink-0" />
        <div className="flex-1 py-1 space-y-2.5">
          <div className="h-4 bg-gray-200 dark:bg-[#202020] rounded-md w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded-md w-1/3" />
          <div className="flex items-center gap-2 pt-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#202020]" />
            <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded-md w-28" />
          </div>
          <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded-md w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-pulse">
      <div className="w-full aspect-video rounded-2xl bg-gray-200 dark:bg-[#202020]" />
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#202020] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-[#202020] rounded-md w-11/12" />
          <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded-md w-2/3" />
          <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded-md w-1/2" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 8, layout = 'grid' }) => (
  <div
    className={
      layout === 'horizontal'
        ? 'flex flex-col gap-4'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8'
    }
  >
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonCard key={idx} layout={layout} />
    ))}
  </div>
);

export default SkeletonCard;
