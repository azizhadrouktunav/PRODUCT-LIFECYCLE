import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BoxesIcon,
  LayersIcon,
  ListTreeIcon,
  MoonIcon,
  NetworkIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
  WavesIcon } from
'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const NAV = [
{ to: '/', label: 'Capabilities', icon: ListTreeIcon, end: true },
{ to: '/groups', label: 'Capability Groups', icon: LayersIcon, end: false },
{ to: '/domains', label: 'Domains', icon: NetworkIcon, end: false },
{ to: '/equipment', label: 'Equipment', icon: BoxesIcon, end: false },
{ to: '/waves', label: 'Waves', icon: WavesIcon, end: false }];


const LOGO_URL = "/ChatGPT_Image_Sep_4,_2026,_10_17_13_AM.png";


function Logo({ collapsed = false }: {collapsed?: boolean;}) {
  return (
    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
      <img src={LOGO_URL} alt="TUNAV" className="h-9 w-9 shrink-0 object-contain" />
      {!collapsed &&
      <span className="min-w-0 leading-tight">
          <span className="block text-sm font-bold tracking-[0.14em] text-strong">TUNAV ONE</span>
          <span className="block text-2xs font-medium tracking-[0.14em] text-brand-bright">
            PRODUCT LIFECYCLE
          </span>
        </span>
      }
    </div>);

}

function ThemeToggle({ compact = false }: {compact?: boolean;}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? SunIcon : MoonIcon;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex items-center gap-2 rounded-md border border-line-strong text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong ${
      compact ? 'justify-center p-1.5' : 'w-full px-2.5 py-1.5 text-xs'}`
      }>
      
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {!compact && (isDark ? 'Light mode' : 'Dark mode')}
    </button>);

}

export function AppShell({ children }: {children: React.ReactNode;}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-full w-full bg-ink-900">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-ink-950 py-6 transition-[width] duration-200 ease-out lg:flex ${
        collapsed ? 'w-[72px] px-3' : 'w-60 px-4'}`
        }>
        
        <Logo collapsed={collapsed} />

        {!collapsed && <p className="mt-2 text-xs italic text-mute">From Capability to Release.</p>}

        <nav className="mt-6 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) =>
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md py-2 text-sm transition-colors duration-150 ease-out ${
            collapsed ? 'justify-center px-0' : 'px-2'} ${
            isActive ? 'bg-ink-700 text-strong' : 'text-mute hover:text-strong'}`
            }>
            
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && label}
            </NavLink>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          <ThemeToggle compact={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            className={`inline-flex items-center gap-2 rounded-md border border-line-strong text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong ${
            collapsed ? 'justify-center p-1.5' : 'px-2.5 py-1.5 text-xs'}`
            }>
            
            {collapsed ?
            <PanelLeftOpenIcon className="h-3.5 w-3.5 shrink-0" /> :

            <>
                <PanelLeftCloseIcon className="h-3.5 w-3.5 shrink-0" />
                Collapse menu
              </>
            }
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line bg-ink-950 px-4 py-3 lg:hidden">
          <Logo />
          <ThemeToggle compact />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-ink-950 px-4 py-2 lg:hidden">
          {NAV.map(({ to, label, end }) =>
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
            `whitespace-nowrap rounded px-2.5 py-1.5 text-xs transition-colors duration-150 ease-out ${
            isActive ? 'bg-ink-700 text-strong' : 'text-mute'}`

            }>
            
              {label}
            </NavLink>
          )}
        </nav>
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>);

}