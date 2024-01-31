// Main Entry Point for the App
import Router, { Switch, Route, Link, useLocation, useRoute } from 'wouter';
import {
  getProdctionLineMetaDatas,
  setProductionLineMetaDatas,
} from './lib/ProductionLine';
import { useState } from 'react';
import { HomeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Home from './pages/Home';

export function AppShell() {
  return (
    <div>
      <div className='z-0 ml-28'>
        <Route path='/'>
          <Home />
        </Route>
      </div>
      <Sidebar />
    </div>
  );
}

function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [plmds, setPlmds] = useState(getProdctionLineMetaDatas());

  return (
    <div className='relative h-screen inline-block'>
      {/* Overlay */}
      {expanded && (
        <div
          className='fixed inset-0 z-0 bg-black bg-opacity-50 cursor-pointer'
          onClick={() => setExpanded(false)}
          onKeyDown={() => setExpanded(false)}
        />
      )}
      {/* Sidebar */}
      <aside className='relative z-50 bg-clip-border w-min h-full'>
        <nav className='menu min-h-full bg-base-200 text-base-content'>
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
                    className='btn btn-ghost btn-sm'
                    onClick={() => setExpanded(true)}
                    type='button'
                  >
                    <ArrowRightIcon className='h-8 w-8 text-primary' />
                  </button>
                  <Link href='/'>
                    <a className='btn btn-ghost btn-sm' href='/'>
                      <HomeIcon className='h-8 w-8 text-primary' title='Home' />
                    </a>
                  </Link>
                </>
              )
            }
          </div>
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
    </div>
  );
}

function AppLogo() {
  return (
    <button type='button' className='btn btn-ghost btn-lg p-0 min-w-56'>
      <span className='relative text-3xl -left-5 text-primary text-left'>
        Satisfactory
      </span>
      <span className='relative -top-3 left-3 text-xl w-48 whitespace-nowrap text-right'>
        Production Planner
      </span>
    </button>
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
