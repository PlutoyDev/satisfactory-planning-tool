// React Counter component
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button type='button' onClick={() => setCount(count + 1)}>
        +
      </button>
      <span>{count}</span>
    </>
  );
}

export default Counter;
