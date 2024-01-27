// Main Entry Point for the App
import Router, { Switch, Route, Link, useLocation, useRoute } from 'wouter';
import {
  getProdctionLineMetaDatas,
  setProductionLineMetaDatas,
} from './lib/ProductionLine';
import { useMemo, useState } from 'react';
import { HomeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export function AppShell() {
  return (
    <div>
      <Sidebar />
    </div>
  );
}

function AppLogo() {
  /* 
     <a href="/" class="btn btn-ghost btm-nav-md">
        <span class="relative text-3xl -top-3 left-6 text-primary">Satisfactory</span>
        <span class="relative text-2xl top-3 -left-12">Planner</span>
      </a>
   */
  return (
    <button type='button' className='btn btn-ghost btn-lg'>
      <span className='relative text-3xl -top-3 left-6 text-primary'>
        Satisfactory
      </span>
      <span className='relative text-2xl top-3 -left-12'>
        Production Planner
      </span>
    </button>
  );
}

function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [plmds, setPlmds] = useState(getProdctionLineMetaDatas());

  return (
    <aside className='h-screen'>
      <nav className='menu p-4 min-h-full bg-base-200 text-base-content rounded-box'>
        <div className='menu-title h-20'>
          {
            // Maintain same height when expanded, expanded shows app logo, collapsed shows expand button
            expanded ? (
              <Link href='/'>
                <AppLogo />
              </Link>
            ) : (
              <>
                <button
                  className='block btn btn-ghost'
                  onClick={() => setExpanded(true)}
                  type='button'
                >
                  <ArrowRightIcon className='h-10 w-10 text-primary' />
                </button>
                <Link href='/'>
                  <a className='block btn btn-ghost' href='/'>
                    <HomeIcon className='h-10 w-10 text-primary' title='Home' />
                  </a>
                </Link>
              </>
            )
          }
        </div>
        <p className='text-2xl menu-title'>App Title</p>
        {plmds.map(plmd => (
          <SidebarLink
            key={plmd.id}
            title={plmd.title}
            href={`/production-lines/${plmd.id}`}
            icon={<img src={plmd.icon} alt={plmd.title} />}
            expanded={expanded}
          />
        ))}
      </nav>
    </aside>
  );
}

interface SidebarLinkProps {
  title: string;
  href: string;
  icon: JSX.Element;
  expanded: boolean;
}

function SidebarLink(props: SidebarLinkProps) {
  const [isActive] = useRoute(props.href);
  return (
    <li>
      <Link
        href={props.href}
        className={`menu-item ${isActive ? 'active' : ''}`}
      >
        <span className='icon'>{props.icon}</span>
        {
          // Only show the title if the sidebar is expanded
          props.expanded && <span className='text'>{props.title}</span>
        }
      </Link>
    </li>
  );
}

export default AppShell;
