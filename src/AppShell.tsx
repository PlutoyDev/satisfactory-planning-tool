// Main Entry Point for the App
import { Route, Link, useRoute } from 'wouter';
import useAppStore from './stores';
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
      <div className='absolute z-0 w-full h-full pt-2 pl-32 pr-4 p'>
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
  const plmds = useAppStore(state => state.plMeta);
  const [isAtHome] = useRoute('/');

  return (
    <div className='absolute inline-block h-screen min-w-28'>
      {/* Overlay */}
      {expanded && (
        <div
          className='fixed inset-0 z-0 bg-black bg-opacity-50 cursor-pointer'
          onClick={() => setExpanded(false)}
          onKeyDown={() => setExpanded(false)}
        >
          {/* Retract Button */}
          <ChevronDoubleLeftIcon
            className='absolute w-8 h-8 top-4 right-4 text-primary'
            onClick={() => setExpanded(false)}
          />
        </div>
      )}
      {/* Sidebar */}
      <aside className='relative z-50 h-full bg-clip-border w-min'>
        <nav className='min-h-full menu bg-base-100 text-base-content'>
          <div className='h-16 menu-title'>
            {
              // Maintain same height when expanded, expanded shows app logo, collapsed shows expand button
              expanded ? (
                <button className='btn btn-ghost' type='button'>
                  <Link href='/'>
                    <AppLogo />
                  </Link>
                </button>
              ) : (
                <>
                  <div className='tooltip tooltip-right' data-tip='Expand'>
                    <button
                      className='btn btn-ghost btn-sm'
                      onClick={() => setExpanded(true)}
                      type='button'
                    >
                      <ChevronDoubleRightIcon className='w-8 h-8 text-primary' />
                    </button>
                  </div>
                  <div className='tooltip tooltip-right' data-tip='Home'>
                    <Link href='/'>
                      <a className='btn btn-ghost btn-sm'>
                        <HomeIcon
                          className='w-8 h-8 text-primary'
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
