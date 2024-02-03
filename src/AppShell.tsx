// Main Entry Point for the App
import { Route, Link, useRoute } from 'wouter';
import { getProdctionLineMetaDatas } from './lib/ProductionLine';
import { useState } from 'react';
import {
  HomeIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
} from '@heroicons/react/24/outline';
import Home from './pages/Home';
import AppLogo from './components/AppLogo';

export function AppShell() {
  return (
    <div>
      <div className='absolute z-0 ml-28'>
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
  const [isAtHome] = useRoute('/');

  return (
    <div className='absolute h-screen inline-block min-w-28'>
      {/* Overlay */}
      {expanded && (
        <div
          className='fixed inset-0 z-0 bg-black bg-opacity-50 cursor-pointer'
          onClick={() => setExpanded(false)}
          onKeyDown={() => setExpanded(false)}
        >
          {/* Retract Button */}
          <ChevronDoubleLeftIcon
            className='absolute top-4 right-4 h-8 w-8 text-primary'
            onClick={() => setExpanded(false)}
          />
        </div>
      )}
      {/* Sidebar */}
      <aside className='relative z-50 bg-clip-border w-min h-full'>
        <nav className='menu min-h-full bg-base-200 text-base-content'>
          <div className='menu-title h-16'>
            {
              // Maintain same height when expanded, expanded shows app logo, collapsed shows expand button
              expanded ? (
                <Link href='/'>
                  <AppLogo />
                </Link>
              ) : (
                <>
                  <div className='tooltip tooltip-right' data-tip='Expand'>
                    <button
                      className='btn btn-ghost btn-sm'
                      onClick={() => setExpanded(true)}
                      type='button'
                    >
                      <ChevronDoubleRightIcon className='h-8 w-8 text-primary' />
                    </button>
                  </div>
                  <div className='tooltip tooltip-right' data-tip='Home'>
                    <Link href='/'>
                      <a className='btn btn-ghost btn-sm'>
                        <HomeIcon
                          className='h-8 w-8 text-primary'
                          title='Home'
                        />
                      </a>
                    </Link>
                  </div>
                </>
              )
            }
          </div>
          <div className='divider'>{expanded ? 'Production Lines' : null}</div>
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
      <div className='tooltip tooltip-right' data-tip={props.title}>
        <Link
          href={props.href}
          className={`menu-item ${isActive ? 'active' : ''}`}
        >
          <a className='btn btn-ghost btn-sm'>
            <span className='icon'>{props.icon}</span>
            {
              // Only show the title if the sidebar is expanded
              props.expanded && <span className='text'>{props.title}</span>
            }
          </a>
        </Link>
      </div>
    </li>
  );
}

export default AppShell;
