// Main Entry Point for the App
import { Route, Link, useRoute } from 'wouter';
import useStore from './stores';
import { useState } from 'react';
import {
  HomeIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import Home from './pages/Home';
import ProductionGraph, { routePattern } from './pages/ProductionGraph';
import AppLogo from './components/AppLogo';

export function AppShell() {
  return (
    <div>
      <div className='absolute z-0 w-full h-full pt-2 pl-20 pr-4 p'>
        <Route path='/'>
          <Home />
        </Route>
        <Route path={routePattern}>
          <ProductionGraph />
        </Route>
      </div>
      <Sidebar />
    </div>
  );
}

function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const prodInfos = useStore(state => state.prodInfos);
  const [isAtHome] = useRoute('/');

  return (
    <div className='absolute inline-block h-screen '>
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
        <nav className='min-h-full flex flex-col items-center py-4 bg-base-100 text-base-content min-w-16'>
          <div className='h-14'>
            {
              // Maintain same height when expanded, expanded shows app logo, collapsed shows expand button
              expanded ? (
                <button className='btn btn-ghost mt-1' type='button'>
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
                  <SidebarLink
                    key='home'
                    title='home'
                    href='/'
                    icon={<HomeIcon className='w-8 h-8 text-primary' />}
                    expanded={expanded}
                  />
                </>
              )
            }
          </div>
          <div className='divider'>{expanded ? 'Production Lines' : null}</div>
          {prodInfos.map(info => (
            <SidebarLink
              key={info.id}
              title={info.title}
              href={`/production-lines/${info.id}`}
              icon={
                info.icon === '???' ? (
                  <p className='font-extrabold w-8 h-8 text-2xl'>?</p>
                ) : (
                  <img src={info.icon} alt={info.title} />
                )
              }
              expanded={expanded}
            />
          ))}
          <SidebarLink
            key='create'
            title='Create new'
            href='/production-lines/create'
            icon={<PlusIcon className='inline-block w-8 h-8 text-primary' />}
            expanded={expanded}
          />
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
    <div className='tooltip tooltip-right' data-tip={props.title}>
      <Link
        href={props.href}
        className={`menu-item ${isActive ? 'active' : ''}`}
      >
        <a className='btn btn-ghost flex-nowrap btn-sm '>
          <span className='icon'>{props.icon}</span>
          {
            // Only show the title if the sidebar is expanded
            props.expanded && (
              <span className='text-ellipsis max-w-60 whitespace-nowrap overflow-hidden'>
                {props.title}
              </span>
            )
          }
        </a>
      </Link>
    </div>
  );
}

export default AppShell;
