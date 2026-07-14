import { useEffect, useRef } from 'react';

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Flask app يعمل على المنفذ الرئيسي — نحمّله داخل iframe كامل الشاشة
  // الـ Flask App workflow يُعرّف outputType=webview ويستمع على المنفذ 5000
  const flaskUrl = (() => {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}/`;
  })();

  useEffect(() => {
    // إذا كان إطار العرض مفتوحاً في نفس الأصل نستخدم URL النسبي
    if (iframeRef.current) {
      iframeRef.current.src = flaskUrl;
    }
  }, [flaskUrl]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#0a0a1a',
      }}
    >
      <iframe
        ref={iframeRef}
        src={flaskUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        title="Abu Mlk Services"
        allowFullScreen
      />
    </div>
  );
}
