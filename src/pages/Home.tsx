import AppLogo from '../components/AppLogo';
import { PlusIcon } from '@heroicons/react/24/outline';

function HomePage() {
  return (
    <div className='w-full'>
      <section className='w-full bg-base-100'>
        <div className='mx-auto w-min pt-2'>
          <AppLogo />
        </div>
      </section>

      <div className='divider'>Introduction</div>

      <section className='mt-4 w-full bg-base-100'>
        <div className='w-full bg-base-200 px-2 pb-4 pt-1 [&>p]:mt-2 [&>p]:indent-4'>
          <p className='!indent-0 text-2xl'>Hello There, Pioneer!</p>
          <p className='text-md'>Welcome to my take on a production planner for Satisfactory.</p>
          <p className='text-md'>This is a work in progress, so please be patient.</p>
          <p className='text-md'>
            Unlike others that are out there, this one is designed to give you the full control of the planning process.
          </p>
        </div>
      </section>

      <div className='divider'>How to use?</div>

      <section className='mt-4 w-full bg-base-100'>
        <div className='w-full bg-base-200 px-2 pb-4 pt-1 [&>p]:mt-2 [&>p]:indent-4'>
          <p className='text-md'>
            To get started, you will need to create a new production line. Click {/* TODO: make this button clickable */}
            on the <PlusIcon className='inline-block h-6 w-6 text-primary' /> button in the sidebar to create a new production line.
          </p>
          <p className='text-md'>
            Once you have created a production line, you can start adding production, logistic or resource nodes to it by dragging from the
            panel on the right.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
