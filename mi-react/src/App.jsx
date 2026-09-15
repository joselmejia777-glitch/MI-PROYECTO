import { useState } from "react";

function App() {

  const [contador, setContador] = useState(0);

  return (
    <div>
      <h1>{contador}</h1>

      <button onClick={() => setContador(contador + 1)}>
        Sumar
      </button>
    </div>
  );

}

export default App;