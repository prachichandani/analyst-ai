'use client';

import { useEffect, useMemo, useRef, useState, useId } from 'react';

interface ArtifactRendererProps {
  title: string;
  html: string;
  data?: unknown;
}

export function ArtifactRenderer({ title, html, data }: ArtifactRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const instanceId = useId();
  const [height, setHeight] = useState(400);
  const [error, setError] = useState<string | null>(null);

  const srcDoc = useMemo(() => buildSrcDoc(html, data, instanceId), [html, data, instanceId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || msg.__artifactId !== instanceId) return;

      if (msg.type === 'artifact:size' && typeof msg.height === 'number') {
        setHeight(Math.min(Math.max(msg.height, 120), 2000));
      }
      if (msg.type === 'artifact:error') {
        setError(String(msg.message ?? 'Something went wrong rendering this widget.'));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [instanceId]);

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden my-3 bg-card">
      <div className="px-4 py-2 border-b border-border/60 bg-muted/40 text-sm font-medium">
        {title}
      </div>

      {error ? (
        <div className="p-4 text-sm text-destructive">
          Couldn&apos;t render this widget: {error}
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          title={title}
          style={{ width: '100%', height, border: 'none', display: 'block' }}
        />
      )}
    </div>
  );
}

function buildSrcDoc(modelHtml: string, data: unknown, instanceId: string) {
  const safeData = JSON.stringify(data ?? null).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: inherit;
    background: transparent;
  }
</style>
</head>
<body>
<div id="artifact-root">
${modelHtml}
</div>

<script>
(function () {
  var ARTIFACT_ID = ${JSON.stringify(instanceId)};
  window.__ARTIFACT_DATA__ = ${safeData};

  // Configure Chart.js to use theme colors
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#64748b';
    Chart.defaults.borderColor = '#e2e8f0';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }

  function reportSize() {
    var height = document.documentElement.scrollHeight;
    window.parent.postMessage({ __artifactId: ARTIFACT_ID, type: 'artifact:size', height: height }, '*');
  }

  function reportError(message) {
    window.parent.postMessage({ __artifactId: ARTIFACT_ID, type: 'artifact:error', message: message }, '*');
  }

  window.onerror = function (message) {
    reportError(String(message));
    return true;
  };

  window.addEventListener('unhandledrejection', function (event) {
    reportError(String(event.reason));
  });

  window.addEventListener('load', function () {
    reportSize();
    // catch late layout shifts (charts mounting, images, etc.)
    new ResizeObserver(reportSize).observe(document.body);
  });
})();
</script>
</body>
</html>`;
}
