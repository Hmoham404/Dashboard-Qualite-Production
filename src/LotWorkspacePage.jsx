import React from 'react';
import { ArrowLeft, Package } from 'lucide-react';

export default function LotWorkspacePage() {
  return <main className="lot-page" lang="en" dir="ltr">
    <header className="lot-page-header">
      <strong><Package size={20} />LOT</strong>
      <a href="#"><ArrowLeft size={18} />Back to dashboard</a>
    </header>
    <section className="lot-page-content" aria-labelledby="lot-page-title">
      <div className="lot-page-icon"><Package size={44} strokeWidth={1.5} /></div>
      <h1 id="lot-page-title">Coming soon</h1>
    </section>
  </main>;
}
