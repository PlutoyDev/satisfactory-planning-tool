// Main Entry Point for the App
import Router, { Switch, Route, Link } from 'wouter';
import {
  getProdctionLineMetaDatas,
  setProductionLineMetaDatas,
} from './lib/ProductionLine';
import { useState } from 'react';

export function AppShell() {
  const [plmds, setPlmds] = useState(getProdctionLineMetaDatas());

  // Sidebar with title, about, and production lines
  return (
    <div className='drawer'>
      <input id='drawer-toggle' type='checkbox' className='drawer-toggle' />
      <div className='drawer-content'>
        <label
          className='btn btn-primary drawer-button'
          htmlFor='drawer-toggle'
          aria-label='open sidebar'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={1.5}
            stroke='currentColor'
            className='w-6 h-6'
          >
            <title>Menu</title>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5'
            />
          </svg>
        </label>
        {/* App content goes here */}
      </div>
      <div className='drawer-side'>
        <label
          className='drawer-overlay'
          htmlFor='drawer-toggle'
          aria-label='close sidebar'
        />
        <ul className='menu p-4 w-80 min-h-full bg-base-200 text-base-content'>
          <p className='text-2xl menu-title'>App Title</p>
          <li>
            <Link href='/'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <title>Home</title>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                />
              </svg>
              Home
            </Link>
          </li>
          <li>
            <Link href='/about'>About</Link>
          </li>
          {
            // Production Lines
            plmds.map(plmd => (
              <li key={plmd.id}>
                <Link href={`/production-line/${plmd.id}`}>{plmd.title}</Link>
              </li>
            ))
          }
          {/* Sidebar Content */}
        </ul>
      </div>
    </div>
  );
}

export default AppShell;
