import AppLogo from '../components/AppLogo';
import { PlusIcon } from '@heroicons/react/24/outline';

function HomePage() {
  return (
    <div className='w-full'>
      <section className='w-full bg-base-100'>
        <div className='pt-2 mx-auto w-min'>
          <AppLogo />
        </div>
      </section>

      <div className='divider'>Introduction</div>

      <section className='w-full mt-4 bg-base-100'>
        <div className='w-full bg-base-200 pt-1 pb-4 px-2 [&>p]:mt-2 [&>p]:indent-4'>
          <p className='text-2xl !indent-0'>Hello There, Pioneer!</p>
          <p className='text-md'>
            Welcome to my take on a production planner for Satisfactory.
          </p>
          <p className='text-md'>
            This is a work in progress, so please be patient.
          </p>
          <p className='text-md'>
            Unlike others that are out there, this one is designed to give you
            the full control of the planning process.
          </p>
        </div>
      </section>

      <div className='divider'>How to use?</div>

      <section className='w-full mt-4 bg-base-100'>
        <div className='w-full bg-base-200 pt-1 pb-4 px-2 [&>p]:mt-2 [&>p]:indent-4'>
          <p className='text-md'>
            To get started, you will need to create a new production line. Click{' '}
            {/* TODO: make this button clickable */}
            on the <PlusIcon className='inline-block w-6 h-6 text-primary' />{' '}
            button in the sidebar to create a new production line.
          </p>
          <p className='text-md'>
            Once you have created a production line, you can start adding
            production, logistic or resource nodes to it by dragging from the
            panel on the right.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
