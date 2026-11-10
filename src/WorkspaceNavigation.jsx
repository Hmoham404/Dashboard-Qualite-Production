import React from 'react';
import { FileText, LayoutDashboard, Package } from 'lucide-react';

export default function WorkspaceNavigation({ current, onNavigate, t = (value) => value }) {
  return <nav className="workspace-navigation" aria-label={t('Navigation principale')}>
    {[
      ['dashboard', '#', LayoutDashboard, 'Tableau de bord'],
      ['lot', '#lot', Package, 'LOT'],
      ['reports', '#reports', FileText, 'Rapports d’anomalie'],
    ].map(([key, href, Icon, label]) => <a key={key} href={href} aria-current={current === key ? 'page' : undefined} onClick={onNavigate}>
      <Icon size={17} />{t(label)}
    </a>)}
  </nav>;
}
