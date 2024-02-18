// Main Entry Point for the App
import { Route, Link, useRoute } from 'wouter';
import { useState } from 'react';
import { HomeIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, PlusIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import Home from './pages/Home';
import ProductionGraph, { routePattern } from './pages/ProductionGraph';
import AppLogo from './components/AppLogo';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { DocsProvider } from './context/DocsContext';
import { ReactFlowProvider } from 'reactflow';
import { ProductionLineStoreProvider, useProductionLineStore } from './lib/store';

function ErrorFallback({ error }: FallbackProps) {
  return (
    <div role='alert' className='flex h-full flex-col items-center justify-center bg-error'>
      <QuestionMarkCircleIcon className='h-14 w-14 text-error-content' />
      <p className='mt-4 text-center text-lg'>{error.message}</p>
    </div>
  );
}

export function AppShell() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div>
        <ProductionLineStoreProvider>
          <DocsProvider LoaderComponent={<div className='skeleton h-screen w-screen' />}>
            <div className='p absolute z-0 h-full w-full pl-20 pr-4 pt-2'>
              <Route path='/'>
                <Home />
              </Route>
              <Route path={routePattern}>
                <ReactFlowProvider>
                  <ProductionGraph />
                </ReactFlowProvider>
              </Route>
            </div>
            <Sidebar />
          </DocsProvider>
        </ProductionLineStoreProvider>
      </div>
    </ErrorBoundary>
  );
}

function Sidebar() {
  const { productionLineInfos, createProductionLine, loadProductionLineFromIdb } = useProductionLineStore(s => ({
    productionLineInfos: s.productionLineInfos,
    createProductionLine: s.createProductionLine,
    loadProductionLineFromIdb: s.loadProductionLineFromIdb,
  }));
  const [expanded, setExpanded] = useState(false);
  const [isAtHome] = useRoute('/');

  return (
    <div className='absolute inline-block h-screen '>
      {/* Overlay */}
      {expanded && (
        <div
          className='fixed inset-0 z-0 cursor-pointer bg-black bg-opacity-50'
          onClick={() => setExpanded(false)}
          onKeyDown={() => setExpanded(false)}
        >
          {/* Retract Button */}
          <ChevronDoubleLeftIcon className='absolute right-4 top-4 h-8 w-8 text-primary' onClick={() => setExpanded(false)} />
        </div>
      )}
      {/* Sidebar */}
      <aside className='relative z-50 h-full w-min bg-clip-border'>
        <nav className='flex min-h-full min-w-16 flex-col items-center bg-base-100 py-4 pl-1 text-base-content'>
          <div className='h-14'>
            {
              // Maintain same height when expanded, expanded shows app logo, collapsed shows expand button
              expanded ? (
                <Link href='/'>
                  <button className='btn btn-ghost mt-1' type='button'>
                    <AppLogo />
                  </button>
                </Link>
              ) : (
                <>
                  <SidebarButton
                    title='Expand'
                    onclick={() => setExpanded(true)}
                    icon={<ChevronDoubleRightIcon className='h-8 w-8 text-primary' />}
                    expanded={expanded}
                  />
                  <SidebarButton
                    title='Home'
                    onclick={() => setExpanded(true)}
                    icon={<HomeIcon className='h-8 w-8 text-primary' />}
                    expanded={expanded}
                    isActive={isAtHome}
                  />
                </>
              )
            }
          </div>
          <div className='divider'>{expanded ? 'Production Lines' : null}</div>
          {productionLineInfos.map(info => (
            <SidebarButton
              key={info.id}
              title={info.title}
              onclick={() => loadProductionLineFromIdb(info.id)}
              icon={
                info.icon === '???' ? (
                  <p className='h-8 w-8 text-2xl font-extrabold'>?</p>
                ) : (
                  <img src={info.icon} alt={info.title} height={24} width={24} />
                )
              }
              expanded={expanded}
            />
          ))}
          <SidebarButton
            key='create'
            title='Create new'
            onclick={() => createProductionLine()}
            icon={<PlusIcon className='inline-block h-8 w-8 text-primary' />}
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
  const { href, ...btnProps } = props;
  const [isActive] = useRoute(props.href);
  return (
    <Link href={props.href} className={`menu-item ${isActive ? 'active' : ''}`}>
      <SidebarButton {...btnProps} />
    </Link>
  );
}

interface SidebarButtonProps {
  title: string;
  onclick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: JSX.Element;
  expanded: boolean;
  isActive?: boolean;
}

function SidebarButton(props: SidebarButtonProps) {
  const { title, onclick, icon, expanded, isActive } = props;

  return (
    <div className='tooltip tooltip-right' data-tip={title}>
      <button className={`btn btn-ghost btn-sm flex-nowrap bg-opacity-30 ${isActive ? 'bg-black' : ''}`} onClick={onclick} type='button'>
        <span className='icon'>{icon}</span>
        {
          // Only show the title if the sidebar is expanded
          expanded && <span className='max-w-60 overflow-hidden text-ellipsis whitespace-nowrap'>{title}</span>
        }
      </button>
    </div>
  );
}

export default AppShell;
