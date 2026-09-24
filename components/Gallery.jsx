'use client';

import { useState } from 'react';

export function Gallery({ images, name }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return <div className="sk-gallery-main" role="img" aria-label={`${name}: no photo yet`} />;
  }
  const current = images[Math.min(index, images.length - 1)];
  return (
    <div>
      <div className="sk-gallery-main">
        <img src={current.url} alt={current.alt || name} width={current.width || 1000} height={current.height || 1000} fetchPriority="high" />
      </div>
      {images.length > 1 ? (
        <div className="sk-thumbs" role="group" aria-label="Photos">
          {images.map((image, i) => (
            <button key={image.url} type="button" className="sk-thumb" aria-current={i === index} aria-label={`Show photo ${i + 1}`} onClick={() => setIndex(i)}>
              <img src={image.thumbUrl || image.url} alt="" width="64" height="64" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
